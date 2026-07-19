import { Router, Request, Response } from 'express';
import { verifyToken, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { adminDb } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { orderEventService } from '../services/order/OrderEventService.js';

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
router.get('/tasks', requireRole(['delivery']), async (req: AuthRequest, res: Response) => {
  try {
    const deliveryPartnerId = req.user?.uid;
    const snapshot = await adminDb.collection('orders')
      .where('deliveryPartnerId', '==', deliveryPartnerId)
      .where('status', 'in', ['out_for_delivery', 'preparing', 'ready'])
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
router.patch('/orders/:id/status', requireRole(['owner', 'delivery']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Only allow setting to 'delivered' or 'out_for_delivery'
    if (status !== 'delivered' && status !== 'out_for_delivery') {
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

// Update live delivery location
router.post('/orders/:id/location', requireRole(['delivery']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      res.status(400).json({ error: 'Missing coordinates' });
      return;
    }

    const deliveryPartnerId = req.user?.uid;

    await adminDb.collection('active_deliveries').doc(id).set({
      order_id: id,
      delivery_partner_id: deliveryPartnerId,
      status: 'active',
      current_lat: lat,
      current_lng: lng,
      updated_at: new Date().toISOString()
    }, { merge: true });

    res.json({ success: true });
  } catch (error) {
    console.error("Live tracking error:", error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

export default router;
