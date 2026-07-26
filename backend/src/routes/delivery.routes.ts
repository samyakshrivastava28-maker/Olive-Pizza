import { Router, Request, Response } from 'express';
import { verifyToken, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { adminDb } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { orderEventService } from '../services/order/OrderEventService.js';
import { pgPool } from '../config/postgres.js';

const router = Router();

router.use(verifyToken);

// Customer gets live location via polling
router.get('/orders/:id/location', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const doc = await adminDb.collection('active_deliveries').doc(id).get();
    
    if (!doc.exists) {
      res.status(404).json({ error: 'Delivery tracking not found' });
      return;
    }
    
    const data = doc.data()!;
    res.json({
      currentLat: data.current_lat,
      currentLng: data.current_lng,
      status: data.status,
      updatedAt: data.updated_at
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tracking' });
  }
});

// Delivery partner gets their active tasks
router.get('/tasks', requireRole(['delivery', 'delivery_partner']), async (req: AuthRequest, res: Response) => {
  try {
    const deliveryPartnerId = req.user?.uid;
    const snapshot = await adminDb.collection('orders')
      .where('deliveryPartnerId', '==', deliveryPartnerId)
      .where('status', 'in', ['partner_assigned', 'out_for_delivery', 'preparing', 'ready', 'picked_up'])
      .get();
      
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Update order status (used by delivery dashboard)
router.patch('/orders/:id/status', requireRole(['owner', 'delivery', 'delivery_partner']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const allowedStatuses = ['delivered', 'out_for_delivery', 'picked_up', 'partner_assigned', 'ready'];
    if (!allowedStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status update for delivery partner' });
      return;
    }

    await adminDb.collection('orders').doc(id).update({
      status: status,
      updatedAt: FieldValue.serverTimestamp()
    });
    
    // Emit event so notifications are triggered
    orderEventService.emitStatusChange(id, status, req.user?.uid || 'system');
    
    res.json({ message: `Order status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Update live delivery location (supports /orders/:id/location and /location)
const handleLocationUpdate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { lat, lng, latitude, longitude, speed, heading, accuracy, orderId } = req.body;

    const actualLat = lat !== undefined ? lat : latitude;
    const actualLng = lng !== undefined ? lng : longitude;
    const targetOrderId = id || orderId || null;

    if (actualLat === undefined || actualLng === undefined) {
      res.status(400).json({ error: 'Missing coordinates' });
      return;
    }

    const deliveryPartnerId = req.user?.uid;
    if (!deliveryPartnerId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // 1. Update PostgreSQL delivery_locations (Triggers Supabase Realtime)
    try {
      const client = await pgPool.connect();
      await client.query(`
        INSERT INTO delivery_locations 
          (delivery_partner_id, active_order_id, latitude, longitude, accuracy, speed, heading, online_status, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, CURRENT_TIMESTAMP)
        ON CONFLICT (delivery_partner_id) 
        DO UPDATE SET 
          active_order_id = COALESCE($2, delivery_locations.active_order_id),
          latitude = $3,
          longitude = $4,
          accuracy = $5,
          speed = $6,
          heading = $7,
          online_status = true,
          last_updated = CURRENT_TIMESTAMP
      `, [deliveryPartnerId, targetOrderId, actualLat, actualLng, accuracy || null, speed || null, heading || null]);
      client.release();
    } catch (pgErr: any) {
      console.warn('[LocationUpdate] Postgres update warning:', pgErr.message);
    }

    // 2. Update Firestore active_deliveries (Triggers Firestore Polling Fallback)
    const docId = targetOrderId || deliveryPartnerId;
    await adminDb.collection('active_deliveries').doc(docId).set({
      order_id: targetOrderId,
      delivery_partner_id: deliveryPartnerId,
      status: 'active',
      current_lat: actualLat,
      current_lng: actualLng,
      speed: speed || 0,
      heading: heading || 0,
      updated_at: new Date().toISOString()
    }, { merge: true });

    res.json({ success: true });
  } catch (error) {
    console.error("Live tracking error:", error);
    res.status(500).json({ error: 'Failed to update location' });
  }
};

router.post('/orders/:id/location', requireRole(['delivery', 'delivery_partner']), handleLocationUpdate);
router.post('/location', requireRole(['delivery', 'delivery_partner']), handleLocationUpdate);

export default router;
