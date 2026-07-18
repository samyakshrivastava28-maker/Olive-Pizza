import { Router, Request, Response } from 'express';
import { query } from '../lib/db.js';
import { verifyToken, requireRole, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verifyToken);

// Customer gets live location via polling
router.get('/orders/:id/location', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT current_lat as "currentLat", current_lng as "currentLng", status, updated_at FROM active_deliveries WHERE order_id = $1', [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Delivery tracking not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tracking data' });
  }
});

// The remaining routes require delivery/owner roles
router.use(requireRole(['owner', 'delivery_partner']));

// Fetch active tasks for delivery dashboard
router.get('/orders', async (req: AuthRequest, res: Response) => {
  try {
    // Delivery routes should query Firestore
    const snapshot = await adminDb.collection('orders').where('status', 'in', ['out_for_delivery', 'delivered']).orderBy('createdAt', 'desc').get();
    const result = { rows: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) };
    res.json(result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      status: row.status,
      totalAmount: Number(row.total_amount),
      contactPhone: row.contact_phone,
      deliveryAddress: row.delivery_address,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Update order status (used by delivery dashboard)
router.patch('/orders/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Only allow setting to 'delivered' or 'out_for_delivery'
    if (status !== 'delivered' && status !== 'out_for_delivery') {
      res.status(400).json({ error: 'Invalid status update for delivery partner' });
      return;
    }

    await query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
    
    res.json({ message: `Order status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Update live delivery location
router.post('/orders/:id/location', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      res.status(400).json({ error: 'Missing coordinates' });
      return;
    }

    const deliveryPartnerId = req.user?.uid;

    // Upsert the delivery tracking row
    const sql = `
      INSERT INTO active_deliveries (order_id, delivery_partner_id, status, current_lat, current_lng)
      VALUES ($1, $2, 'active', $3, $4)
      ON CONFLICT (order_id) DO UPDATE 
      SET current_lat = EXCLUDED.current_lat, 
          current_lng = EXCLUDED.current_lng, 
          updated_at = NOW()
    `;
    await query(sql, [id, deliveryPartnerId, lat, lng]);

    res.json({ success: true });
  } catch (error) {
    console.error("Live tracking error:", error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

export default router;
