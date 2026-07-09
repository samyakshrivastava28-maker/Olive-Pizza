/**
 * Enterprise Notification Routes
 *
 * Endpoints:
 * POST /notifications/action         — Service Worker quick actions (order state machine)
 * POST /notifications/send-custom    — Owner broadcast push notifications
 * POST /notifications/track          — Acknowledge delivered/opened/clicked
 * POST /notifications/token          — Register/refresh FCM token
 * GET  /notifications/inbox          — Fetch user's notification inbox
 * PATCH /notifications/inbox/:id     — Mark inbox item read / archived
 * GET  /notifications/analytics      — Owner notification analytics
 * POST /notifications/preferences    — Update DND preferences
 * GET  /notifications/preferences    — Get DND preferences
 * POST /notifications/retry-failed   — Owner: retry failed notifications
 * POST /notifications/cleanup        — Owner: trigger manual cleanup
 */

import { Router, Request, Response } from 'express';
import { adminDb as db } from '../config/firebase.js';
import * as admin from 'firebase-admin';
import { pgPool } from '../config/postgres.js';
import { notificationScheduler } from '../services/notification/NotificationScheduler.js';
import { OwnerTemplates, CustomerTemplates, DeliveryTemplates, MarketingTemplates, type OrderStatus } from '../services/notification/NotificationTemplates.js';
import { notificationQueue } from '../services/notification/NotificationQueueService.js';
import { verifyToken, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

// ─── Helper: Resolve owner UIDs ───────────────────────────────────────────────
async function getOwnerUserIds(): Promise<string[]> {
  const snapshot = await db.collection('users').where('role', '==', 'owner').get();
  return snapshot.docs.map(d => d.id);
}

// ─── Helper: Resolve user's Postgres UUID from Firebase UID ───────────────────
async function getPostgresUserId(firebaseUid: string): Promise<string | null> {
  const client = await pgPool.connect();
  try {
    const result = await client.query('SELECT id FROM users WHERE firebase_uid = $1', [firebaseUid]);
    return result.rows[0]?.id || null;
  } finally {
    client.release();
  }
}

// ─── Helper: Acquire order lock (prevent race conditions) ─────────────────────
async function acquireOrderLock(orderId: string, firebaseUid: string, action: string): Promise<boolean> {
  const client = await pgPool.connect();
  try {
    const pgUserId = await getPostgresUserId(firebaseUid);
    if (!pgUserId) return false;

    const result = await client.query(
      `INSERT INTO order_locks (order_id, locked_by, action, locked_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (order_id) DO NOTHING
       RETURNING order_id`,
      [orderId, pgUserId, action]
    );
    return result.rows.length > 0;
  } catch {
    return false;
  } finally {
    client.release();
  }
}

async function releaseOrderLock(orderId: string): Promise<void> {
  const client = await pgPool.connect();
  try {
    await client.query('DELETE FROM order_locks WHERE order_id = $1', [orderId]);
  } finally {
    client.release();
  }
}

// =============================================================================
// POST /notifications/action
// Service Worker quick actions — handles Accept, Reject, Start Cooking, etc.
// =============================================================================
router.post('/action', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const { orderId, action, currentStage, partnerId } = req.body;
  const userId = req.user!.uid;

  if (!orderId || !action) {
    res.status(400).json({ error: 'Missing orderId or action' });
    return;
  }

  // ── Security: Verify user exists and has permission ──
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }
  const userRole = userDoc.data()?.role as string;

  // ── Order Locking: prevent race conditions ──────────────────────────────
  const lockAcquired = await acquireOrderLock(orderId, userId, action);
  if (!lockAcquired) {
    res.status(409).json({ error: 'Order is currently being processed by another request' });
    return;
  }

  const pgClient = await pgPool.connect();
  try {
    // ── Fetch order from Postgres (source of truth) ─────────────────────
    await pgClient.query('BEGIN');

    const orderResult = await pgClient.query(
      'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    if (orderResult.rows.length === 0) {
      await pgClient.query('ROLLBACK');
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const order = orderResult.rows[0];
    const customerFirebaseUid = await getCustomerFirebaseUid(pgClient, order.user_id);
    const orderDoc = await db.collection('orders').doc(orderId).get();
    const orderData = orderDoc.data() || {};
    const shortId = orderData.dailyOrderNumber || `#${orderId.slice(-6).toUpperCase()}`;
    let newStatus = order.status;
    let responseData: any = {};

    // ─── State Machine ─────────────────────────────────────────────────────
    if (action === 'accept' && currentStage === 'new_order' && userRole === 'owner') {
      newStatus = 'accepted';
      await pgClient.query("UPDATE orders SET status = 'accepted', updated_at = NOW() WHERE id = $1", [orderId]);

      // Notify customer
      if (customerFirebaseUid) {
        const payload = CustomerTemplates.orderUpdate(orderId, {
          orderNumber: shortId, status: 'accepted', totalAmount: Number(order.total_amount),
          eta: '20-30 mins', version: 2
        });
        await notificationQueue.enqueue(customerFirebaseUid, payload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 2 });
      }
      // Update owner live card
      const ownerPayload = OwnerTemplates.orderStatusUpdate(orderId, {
        orderNumber: shortId, customerName: order.contact_phone, status: 'accepted', totalAmount: Number(order.total_amount), version: 2
      });
      await notificationQueue.enqueue(userId, ownerPayload, 'normal', { tag: `order_owner_${orderId}`, orderId, category: 'order', version: 2 });
      responseData = { message: 'Order accepted' };
    }

    else if (action === 'reject' && userRole === 'owner') {
      newStatus = 'cancelled';
      await pgClient.query("UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1", [orderId]);

      if (customerFirebaseUid) {
        const payload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'cancelled', totalAmount: Number(order.total_amount), version: 2 });
        await notificationQueue.enqueue(customerFirebaseUid, payload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 2 });
      }
      responseData = { message: 'Order rejected' };
    }

    else if (action === 'start_cooking' && userRole === 'owner') {
      newStatus = 'preparing';
      await pgClient.query("UPDATE orders SET status = 'preparing', updated_at = NOW() WHERE id = $1", [orderId]);

      if (customerFirebaseUid) {
        const payload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'preparing', totalAmount: Number(order.total_amount), version: 3 });
        await notificationQueue.enqueue(customerFirebaseUid, payload, 'normal', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 3 });
      }
      responseData = { message: 'Cooking started' };
    }

    else if (action === 'ready' && userRole === 'owner') {
      newStatus = 'ready';
      await pgClient.query("UPDATE orders SET status = 'ready', updated_at = NOW() WHERE id = $1", [orderId]);

      if (customerFirebaseUid) {
        const payload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'ready', totalAmount: Number(order.total_amount), version: 4 });
        await notificationQueue.enqueue(customerFirebaseUid, payload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 4 });
      }
      responseData = { message: 'Order marked ready' };
    }

    else if (action === 'assign_delivery' && userRole === 'owner' && partnerId) {
      // Verify partner exists
      const partnerResult = await pgClient.query(
        "SELECT firebase_uid, name FROM users WHERE id = $1 AND role = 'delivery'",
        [partnerId]
      );
      if (partnerResult.rows.length === 0) {
        await pgClient.query('ROLLBACK');
        res.status(400).json({ error: 'Invalid delivery partner' });
        return;
      }
      const partner = partnerResult.rows[0];

      newStatus = 'partner_assigned';
      await pgClient.query(
        "UPDATE orders SET status = 'partner_assigned', delivery_partner_id = $1, updated_at = NOW() WHERE id = $2",
        [partnerId, orderId]
      );

      // Notify delivery partner
      const deliveryPayload = DeliveryTemplates.newAssignment(orderId, {
        orderNumber: shortId, customerName: 'Customer', customerPhone: order.contact_phone,
        deliveryAddress: order.delivery_address_line, distance: '?', eta: '15 mins',
        totalAmount: Number(order.total_amount), paymentMethod: 'COD', version: 1
      });
      await notificationQueue.enqueue(partner.firebase_uid, deliveryPayload, 'high', { tag: `order_delivery_${orderId}`, orderId, category: 'delivery', priority: 'critical', version: 1 });

      // Update customer
      if (customerFirebaseUid) {
        const cPayload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'partner_assigned', totalAmount: Number(order.total_amount), deliveryPartnerName: partner.name || 'Partner', version: 5 });
        await notificationQueue.enqueue(customerFirebaseUid, cPayload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 5 });
      }
      responseData = { message: 'Partner assigned' };
    }

    else if (action === 'accept_delivery' && userRole === 'delivery') {
      if (order.delivery_partner_id !== userId) {
        await pgClient.query('ROLLBACK');
        res.status(403).json({ error: 'You are not assigned to this order' });
        return;
      }
      const dPayload = DeliveryTemplates.deliveryUpdate(orderId, { orderNumber: shortId, customerName: 'Customer', deliveryAddress: order.delivery_address_line, stage: 'navigate_restaurant', version: 2 });
      await notificationQueue.enqueue(userId, dPayload, 'high', { tag: `order_delivery_${orderId}`, orderId, category: 'delivery', version: 2 });
      responseData = { message: 'Delivery accepted' };
    }

    else if (action === 'picked_up' && userRole === 'delivery') {
      newStatus = 'out_for_delivery';
      await pgClient.query("UPDATE orders SET status = 'out_for_delivery', updated_at = NOW() WHERE id = $1", [orderId]);

      const dPayload = DeliveryTemplates.deliveryUpdate(orderId, { orderNumber: shortId, customerName: 'Customer', deliveryAddress: order.delivery_address_line, stage: 'out_for_delivery', version: 3 });
      await notificationQueue.enqueue(userId, dPayload, 'high', { tag: `order_delivery_${orderId}`, orderId, category: 'delivery', version: 3 });

      if (customerFirebaseUid) {
        const cPayload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'out_for_delivery', totalAmount: Number(order.total_amount), version: 6 });
        await notificationQueue.enqueue(customerFirebaseUid, cPayload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 6 });
      }
      responseData = { message: 'Picked up — out for delivery' };
    }

    else if (action === 'delivered' && userRole === 'delivery') {
      newStatus = 'delivered';
      await pgClient.query(
        "UPDATE orders SET status = 'delivered', updated_at = NOW() WHERE id = $1",
        [orderId]
      );

      if (customerFirebaseUid) {
        let title = `Update for ${shortId}`;
        let body = `Order status updated to ${newStatus}`;
        
        switch (newStatus) {
          case 'accepted': title = `Order Accepted — ${shortId}`; body = 'The restaurant is now preparing your pizza!'; break;
          case 'ready': title = `Order Ready — ${shortId}`; body = 'Your order is packed and waiting for delivery.'; break;
          case 'out_for_delivery': title = `Out for Delivery — ${shortId}`; body = 'Your pizza is on the way! Track live.'; break;
          case 'delivered': title = `Delivered — ${shortId}`; body = 'Enjoy your meal! Thanks for choosing Olive Pizza.'; break;
        }
        
        const cPayload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'delivered', totalAmount: Number(order.total_amount), version: 7 });
        await notificationQueue.enqueue(customerFirebaseUid, cPayload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 7 });
      }

      // Notify owner of completion
      const ownerIds = await getOwnerUserIds();
      for (const ownerId of ownerIds) {
        const oPayload = OwnerTemplates.orderStatusUpdate(orderId, { orderNumber: shortId, customerName: '', status: 'delivered', totalAmount: Number(order.total_amount), version: 99 });
        await notificationQueue.enqueue(ownerId, oPayload, 'normal', { tag: `order_owner_${orderId}`, orderId, category: 'order', version: 99 });
      }
      responseData = { message: 'Delivered — order complete' };
    }

    else if (action === 'stop_alert') {
      // Send a silent push to all devices of this user to stop the alert.
      const stopPayload = {
        notification: { title: '', body: '' }, // Dummy, will be ignored by SW if we use data-only, wait, FCM requires notification or data. Let's just send data-only.
        data: { action: 'STOP_ALERT', orderId, stage: currentStage, category: 'system' }
      };
      // For data-only, we can just omit notification property. But NotificationPayload type requires it.
      // So we send an empty one and handle it in SW.
      await notificationQueue.enqueue(userId, { notification: { title: 'Stop Alert', body: '' }, data: stopPayload.data }, 'high', { tag: `stop_alert_${orderId}`, orderId, category: 'system' });
      responseData = { message: 'Alert stopped' };
    }

    else {
      await pgClient.query('ROLLBACK');
      res.status(400).json({ error: `Unknown action "${action}" for role "${userRole}" at stage "${currentStage}"` });
      return;
    }

    await pgClient.query('COMMIT');
    res.json({ success: true, newStatus, ...responseData });

  } catch (error: any) {
    await pgClient.query('ROLLBACK').catch(() => {});
    console.error('[NotificationRoutes] Action error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    pgClient.release();
    await releaseOrderLock(orderId);
  }
});

// ─── Helper: Get customer firebase UID from order ─────────────────────────────
async function getCustomerFirebaseUid(client: any, pgUserId: string): Promise<string | null> {
  try {
    const result = await client.query('SELECT firebase_uid FROM users WHERE id = $1', [pgUserId]);
    return result.rows[0]?.firebase_uid || null;
  } catch {
    return null;
  }
}

// =============================================================================
// POST /notifications/token
// Frontend registers/refreshes FCM token
// =============================================================================
router.post('/token', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { token, oldToken, deviceId, deviceName, platform, browser, appVersion } = req.body;
    const userId = req.user!.uid;

    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    await notificationQueue.registerToken(userId, token, { oldToken, deviceId, deviceName, platform, browser, appVersion });
    res.json({ success: true });
  } catch (error: any) {
    console.error('[NotificationRoutes] Token registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// POST /notifications/track
// Service Worker and client report delivery/open/action events
// =============================================================================
router.post('/track', async (req: Request, res: Response): Promise<void> => {
  try {
    const { queueId, stage, orderId, openTimeMs } = req.body;
    if (!queueId || !stage) {
      res.status(400).json({ error: 'queueId and stage required' });
      return;
    }

    const client = await pgPool.connect();
    try {
      if (stage === 'delivered') {
        await client.query(`UPDATE notification_queue SET status = 'delivered' WHERE id = $1`, [queueId]);
      } else if (stage === 'opened') {
        await client.query(`UPDATE notification_queue SET status = 'opened' WHERE id = $1`, [queueId]);
        // Track open time in inbox
        if (orderId) {
          await client.query(
            `UPDATE notification_inbox SET is_read = TRUE, read_at = NOW() WHERE tag LIKE $1`,
            [`%${orderId}%`]
          );
        }
      } else if (stage === 'action_performed') {
        await client.query(`UPDATE notification_queue SET status = 'action_performed' WHERE id = $1`, [queueId]);
      }
    } finally {
      client.release();
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// GET /notifications/inbox
// Fetch user's notification inbox (persistent, never lost)
// =============================================================================
router.get('/inbox', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const pgUserId = await getPostgresUserId(userId);
    if (!pgUserId) {
      res.json({ items: [] });
      return;
    }

    const client = await pgPool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM notification_inbox
         WHERE user_id = $1
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY created_at DESC
         LIMIT 100`,
        [pgUserId]
      );
      res.json({ items: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// PATCH /notifications/inbox/:id
// Mark inbox item as read or archived
// =============================================================================
router.patch('/inbox/:id', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isRead, isArchived } = req.body;
    const userId = req.user!.uid;
    const pgUserId = await getPostgresUserId(userId);
    if (!pgUserId) { res.status(404).json({ error: 'User not found' }); return; }

    const client = await pgPool.connect();
    try {
      await client.query(
        `UPDATE notification_inbox
         SET is_read = COALESCE($1, is_read),
             is_archived = COALESCE($2, is_archived),
             read_at = CASE WHEN $1 = TRUE AND read_at IS NULL THEN NOW() ELSE read_at END,
             updated_at = NOW()
         WHERE id = $3 AND user_id = $4`,
        [isRead, isArchived, id, pgUserId]
      );
      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// POST /notifications/send-custom
// Owner: broadcast push notification to a segment
// =============================================================================
router.post('/send-custom', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const ownerDoc = await db.collection('users').doc(userId).get();
    if (!ownerDoc.exists || ownerDoc.data()?.role !== 'owner') {
      res.status(403).json({ error: 'Owner access required' });
      return;
    }

    const { title, body, audience, category, url, couponCode, expiryDate } = req.body;
    if (!title || !body) {
      res.status(400).json({ error: 'Title and body are required' });
      return;
    }

    // Fetch targets from PostgreSQL
    let queryParams: any[] = [];
    let queryText = 'SELECT firebase_uid FROM users';
    
    if (audience === 'customers') {
      queryText += ' WHERE role = $1';
      queryParams.push('customer');
    } else if (audience === 'delivery') {
      queryText += ' WHERE role = $1';
      queryParams.push('delivery');
    }
    // audience === 'all' fetches everyone without a WHERE clause

    const client = await pgPool.connect();
    let pgUsers = [];
    try {
      const res = await client.query(queryText, queryParams);
      pgUsers = res.rows;
    } finally {
      client.release();
    }

    let queuedCount = 0;

    for (const row of pgUsers) {
      const targetId = row.firebase_uid;
      let payload: any;

      if (category === 'coupon' && couponCode) {
        payload = MarketingTemplates.couponAlert({ title, body, couponCode, expiryDate: expiryDate || 'soon' });
      } else if (category === 'announcement') {
        payload = MarketingTemplates.announcement({ title, body, url });
      } else {
        payload = {
          notification: { title, body },
          data: { url: url || '/', category: category || 'marketing', source: 'owner_broadcast' }
        };
      }

      await notificationQueue.enqueue(targetId, payload, 'normal', {
        category: category || 'marketing',
        expiresInSeconds: category === 'marketing' || category === 'announcement' ? 86400 : undefined,
      });
      queuedCount++;
    }

    res.json({ success: true, message: `Queued for ${queuedCount} users` });
  } catch (error: any) {
    console.error('[NotificationRoutes] send-custom error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// GET /notifications/analytics
// Owner: notification system analytics
// =============================================================================
router.get('/analytics', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const ownerDoc = await db.collection('users').doc(userId).get();
    if (!ownerDoc.exists || ownerDoc.data()?.role !== 'owner') {
      res.status(403).json({ error: 'Owner access required' });
      return;
    }

    const client = await pgPool.connect();
    try {
      const [analytics, queueStats, tokenStats] = await Promise.all([
        client.query(
          `SELECT * FROM notification_analytics
           WHERE period_date >= CURRENT_DATE - INTERVAL '7 days'
           ORDER BY period_date DESC, category`
        ),
        client.query(
          `SELECT status, COUNT(*) as count FROM notification_queue GROUP BY status`
        ),
        client.query(
          `SELECT is_active, COUNT(*) as count FROM fcm_tokens GROUP BY is_active`
        ),
      ]);

      res.json({
        analytics: analytics.rows,
        queue: queueStats.rows,
        tokens: tokenStats.rows,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// POST /notifications/preferences
// Update DND preferences for the current user
// =============================================================================
router.post('/preferences', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const pgUserId = await getPostgresUserId(userId);
    if (!pgUserId) { res.status(404).json({ error: 'User not found' }); return; }

    const { muteMarketing, muteLowPriority, alwaysReceiveOrders, alwaysReceiveAlerts, quietHoursStart, quietHoursEnd } = req.body;

    const client = await pgPool.connect();
    try {
      await client.query(
        `INSERT INTO notification_preferences (user_id, mute_marketing, mute_low_priority, always_receive_orders, always_receive_alerts, quiet_hours_start, quiet_hours_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id) DO UPDATE SET
           mute_marketing = EXCLUDED.mute_marketing,
           mute_low_priority = EXCLUDED.mute_low_priority,
           always_receive_orders = EXCLUDED.always_receive_orders,
           always_receive_alerts = EXCLUDED.always_receive_alerts,
           quiet_hours_start = EXCLUDED.quiet_hours_start,
           quiet_hours_end = EXCLUDED.quiet_hours_end,
           updated_at = NOW()`,
        [pgUserId, muteMarketing ?? false, muteLowPriority ?? false, alwaysReceiveOrders ?? true, alwaysReceiveAlerts ?? true, quietHoursStart, quietHoursEnd]
      );
      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// GET /notifications/preferences
// =============================================================================
router.get('/preferences', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const pgUserId = await getPostgresUserId(userId);
    if (!pgUserId) { res.json({ preferences: null }); return; }

    const client = await pgPool.connect();
    try {
      const result = await client.query('SELECT * FROM notification_preferences WHERE user_id = $1', [pgUserId]);
      res.json({ preferences: result.rows[0] || null });
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// POST /notifications/cleanup (Owner)
// =============================================================================
router.post('/cleanup', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const ownerDoc = await db.collection('users').doc(userId).get();
    if (!ownerDoc.exists || ownerDoc.data()?.role !== 'owner') {
      res.status(403).json({ error: 'Owner access required' });
      return;
    }
    await notificationQueue.runCleanup();
    res.json({ success: true, message: 'Cleanup complete' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// POST /notifications/trigger-event (Firebase-Native Notification Trigger)
// =============================================================================
router.post('/trigger-event', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId, action, partnerId } = req.body;
    if (!orderId || !action) {
      res.status(400).json({ error: 'Missing orderId or action' });
      return;
    }

    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const order = orderDoc.data()!;
    const shortId = order.dailyOrderNumber || `#${orderId.slice(-6).toUpperCase()}`;
    const customerFirebaseUid = order.userId;
    const totalAmount = order.totalAmount || 0;
    const contactPhone = order.contactPhone || '';
    const deliveryAddress = order.deliveryAddress?.addressLine || order.address || '';
    const status = order.status;

    if (action === 'new_order') {
      const ownerIds = await getOwnerUserIds();
      const payload = OwnerTemplates.newOrder(orderId, {
        customerName: order.customerName || 'Customer',
        orderNumber: shortId,
        totalAmount,
        itemsCount: order.items?.length || 0,
        paymentMethod: order.paymentMethod || 'COD',
        deliveryAddress,
        phone: contactPhone,
        version: 1
      });
      for (const ownerId of ownerIds) {
        await notificationQueue.enqueue(ownerId, payload, 'high', { tag: `order_owner_${orderId}`, orderId, category: 'order', priority: 'critical', version: 1 });
      }
      
      if (customerFirebaseUid) {
        const cPayload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'pending', totalAmount, version: 1 });
        await notificationQueue.enqueue(customerFirebaseUid, cPayload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 1 });
      }
    }
    else if (action === 'accepted') {
      if (customerFirebaseUid) {
        const payload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'accepted', totalAmount, eta: '20-30 mins', version: 2 });
        await notificationQueue.enqueue(customerFirebaseUid, payload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 2 });
      }
      // Also update owner live card
      const ownerIds = await getOwnerUserIds();
      const ownerPayload = OwnerTemplates.orderStatusUpdate(orderId, { orderNumber: shortId, customerName: contactPhone, status: 'accepted', totalAmount, version: 2 });
      for (const ownerId of ownerIds) {
        await notificationQueue.enqueue(ownerId, ownerPayload, 'normal', { tag: `order_owner_${orderId}`, orderId, category: 'order', version: 2 });
      }
    }
    else if (action === 'cancelled') {
      if (customerFirebaseUid) {
        const payload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'cancelled', totalAmount, version: 2 });
        await notificationQueue.enqueue(customerFirebaseUid, payload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 2 });
      }
    }
    else if (action === 'preparing') {
      if (customerFirebaseUid) {
        const payload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'preparing', totalAmount, version: 3 });
        await notificationQueue.enqueue(customerFirebaseUid, payload, 'normal', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 3 });
      }
    }
    else if (action === 'ready') {
      if (customerFirebaseUid) {
        const payload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'ready', totalAmount, version: 4 });
        await notificationQueue.enqueue(customerFirebaseUid, payload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 4 });
      }
    }
    else if (action === 'partner_assigned') {
      const realPartnerId = partnerId || order.deliveryPartnerId;
      if (realPartnerId) {
        const partnerDoc = await db.collection('users').doc(realPartnerId).get();
        const partnerName = partnerDoc.data()?.name || 'Partner';
        
        const deliveryPayload = DeliveryTemplates.newAssignment(orderId, {
          orderNumber: shortId, customerName: 'Customer', customerPhone: contactPhone,
          deliveryAddress, distance: '?', eta: '15 mins', totalAmount, paymentMethod: order.paymentMethod || 'COD', version: 1
        });
        await notificationQueue.enqueue(realPartnerId, deliveryPayload, 'high', { tag: `order_delivery_${orderId}`, orderId, category: 'delivery', priority: 'critical', version: 1 });
        
        if (customerFirebaseUid) {
          const cPayload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'partner_assigned', totalAmount, deliveryPartnerName: partnerName, version: 5 });
          await notificationQueue.enqueue(customerFirebaseUid, cPayload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 5 });
        }
      }
    }
    else if (action === 'picked_up' || action === 'out_for_delivery') {
      if (customerFirebaseUid) {
        const cPayload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'out_for_delivery', totalAmount, version: 6 });
        await notificationQueue.enqueue(customerFirebaseUid, cPayload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 6 });
      }
    }
    else if (action === 'delivered') {
      if (customerFirebaseUid) {
        const cPayload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'delivered', totalAmount, version: 7 });
        await notificationQueue.enqueue(customerFirebaseUid, cPayload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 7 });
      }
      const ownerIds = await getOwnerUserIds();
      const oPayload = OwnerTemplates.orderStatusUpdate(orderId, { orderNumber: shortId, customerName: '', status: 'delivered', totalAmount, version: 99 });
      for (const ownerId of ownerIds) {
        await notificationQueue.enqueue(ownerId, oPayload, 'normal', { tag: `order_owner_${orderId}`, orderId, category: 'order', version: 99 });
      }
    }
    
    res.json({ success: true, action });
  } catch (error: any) {
    console.error('[NotificationRoutes] trigger-event error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
