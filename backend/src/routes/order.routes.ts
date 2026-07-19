import { Router, Request, Response } from 'express';
import { query } from '../lib/db.js';
import { verifyToken, AuthRequest } from '../middleware/auth.middleware.js';
import { adminDb } from '../config/firebase.js';
import { OwnerTemplates, CustomerTemplates } from '../services/notification/NotificationTemplates.js';
import { directNotification } from '../services/notification/DirectNotificationService.js';
import { orderEventService } from '../services/order/OrderEventService.js';
import { queueEmail } from '../services/email.service.js';
import { buildOrderStatusEmail } from '../services/emailTemplates.service.js';
import crypto from 'crypto';

const router = Router();

// Get orders for logged in user
router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const snapshot = await adminDb.collection('orders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
      
    const orders = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        status: data.status,
        totalAmount: Number(data.totalAmount),
        deliveryFee: Number(data.deliveryFee || 0),
        contactPhone: data.contactPhone,
        deliveryAddress: data.deliveryAddress?.addressLine || data.deliveryAddress,
        createdAt: data.createdAt instanceof Date ? data.createdAt : data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt instanceof Date ? data.updatedAt : data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
      };
    });

    res.json(orders);
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Create a new order securely
router.post('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.uid;
  const isDebug = req.headers['x-debug-mode'] === 'true';
  const startTime = Date.now();
  const trace: any = {
    route: 'POST /api/orders',
    action: 'Place Order',
    userId,
    steps: []
  };

  try {
    const { items } = req.body;
    trace.steps.push({ step: 'Validation', status: 'started' });
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Cart is empty' });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // 1. Fetch user data from Firestore
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      res.status(400).json({ error: 'User not found. Please complete onboarding.' });
      return;
    }
    const userData = userDoc.data()!;
    
    if (!userData.phone) {
      res.status(400).json({ error: 'Phone number missing. Please complete onboarding.' });
      return;
    }

    if (!userData.full_address) {
      res.status(400).json({ error: 'Delivery address missing. Please complete onboarding.' });
      return;
    }

    // 2. Validate prices from Firestore
    let serverCalculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const menuDoc = await adminDb.collection('menu_items').doc(item.menuItemId).get();
      if (!menuDoc.exists) {
        res.status(400).json({ error: `Item ${item.name} no longer exists` });
        return;
      }
      const menuData = menuDoc.data()!;
      
      if (!menuData.isAvailable) {
        res.status(400).json({ error: `Item ${item.name} is currently unavailable` });
        return;
      }

      const itemPrice = Number(menuData.basePrice);
      serverCalculatedTotal += itemPrice * item.quantity;

      validatedItems.push({
        menuItemId: item.menuItemId,
        name: menuData.name,
        price: itemPrice,
        quantity: item.quantity,
        size: item.size || 'regular',
        crust: item.crust || 'normal',
        image: menuData.image || menuData.image_url
      });
    }

    // 2.5 Duplicate Order Prevention (Idempotency / Distributed Lock)
    const deviceId = req.headers['x-device-id'] || req.ip || 'unknown';
    
    const lockResult = await query(`
      INSERT INTO checkout_locks (user_id, device_id, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '3 minutes')
      ON CONFLICT (user_id) DO UPDATE 
      SET device_id = EXCLUDED.device_id,
          locked_at = NOW(),
          expires_at = NOW() + INTERVAL '3 minutes'
      WHERE checkout_locks.expires_at < NOW()
      RETURNING user_id;
    `, [userId, deviceId]);

    if (lockResult.rows.length === 0) {
      if (isDebug) trace.steps.push({ step: 'Idempotency Lock', status: 'failed', reason: 'Order currently placing' });
      res.status(409).json({ error: 'This account is currently placing an order from another device.', trace: isDebug ? trace : undefined });
      return;
    }
    trace.steps.push({ step: 'Idempotency Lock', status: 'success' });

    // 3 & 4. Push Firestore document for real-time tracking (Single source of truth)
    const newOrderId = crypto.randomUUID();
    const shortId = newOrderId.slice(-6).toUpperCase();
    const orderNumber = `OP-${shortId}`;

    try {
      await adminDb.collection('orders').doc(newOrderId).set({
        id: newOrderId,
        userId,
        items: validatedItems,
        totalAmount: serverCalculatedTotal,
        status: 'pending',
        notification_version: 1,
        deliveryAddress: { addressLine: userData.full_address, lat: userData.lat, lng: userData.lng },
        contactPhone: userData.phone,
        customerName: userData.name || 'Customer',
        daily_order_number: orderNumber,
        paymentMethod: 'COD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      trace.steps.push({ step: 'Firestore Write', status: 'success', orderId: newOrderId });
    } catch (err: any) {
      console.warn('[Orders] Firestore write failed:', err);
      trace.steps.push({ step: 'Firestore Write', status: 'error', error: err.message });
      res.status(500).json({ error: 'Failed to save order' });
      return; // Stop execution if DB write fails
    }

    // 5. Emit canonical OrderEvent via OrderEventService (Legacy trigger, can be deprecated later)
    try {
      const event = await orderEventService.emitNewOrder(newOrderId);
      trace.steps.push({ step: 'OrderEventService', status: 'success' });
    } catch (pushErr: any) {
      console.error('[Orders] OrderEventService failed (non-blocking):', pushErr);
      trace.steps.push({ step: 'OrderEventService', status: 'error', error: pushErr.message });
    }

    trace.processingTime = Date.now() - startTime;
    res.status(201).json({ message: 'Order placed successfully', orderId: newOrderId, orderNumber, trace: isDebug ? trace : undefined });
  } catch (error: any) {
    console.error('Error creating order:', error);
    trace.steps.push({ step: 'Fatal Error', status: 'failed', error: error.message });
    trace.processingTime = Date.now() - startTime;
    res.status(500).json({ error: 'Failed to create order', trace: isDebug ? trace : undefined });
  } finally {
    if (userId) {
      try {
        await query('DELETE FROM checkout_locks WHERE user_id = $1', [userId]);
      } catch(e) {
        console.error('Failed to release checkout lock:', e);
      }
    }
  }
});

export default router;
