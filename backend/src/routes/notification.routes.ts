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
import { directNotification } from '../services/notification/DirectNotificationService.js';
import { notificationQueue } from '../services/notification/NotificationQueueService.js';
import { verifyToken, AuthRequest } from '../middleware/auth.middleware.js';
import { orderEventService } from '../services/order/OrderEventService.js';
import { queueEmail } from '../services/email.service.js';
import { buildOrderStatusEmail } from '../services/emailTemplates.service.js';

const router = Router();

// ─── Helper: Timeout wrapper ──────────────────────────────────────────────────
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)), ms))
  ]);
}

// ─── Helper: Resolve owner UIDs ───────────────────────────────────────────────
async function getOwnerUserIds(): Promise<string[]> {
  const snapshot = await db.collection('users').where('role', '==', 'owner').get();
  return snapshot.docs.map(doc => doc.id);
}
}

// ─── Helper: Resolve user's Postgres UUID from Firebase UID ───────────────────
}

// ─── Helper: Acquire order lock (prevent race conditions) ─────────────────────
interface LockInfo {
  success: boolean;
  duplicate?: boolean;
  reason?: string;
  locked_by_name?: string;
  locked_at?: string;
  action?: string;
  age_seconds?: number;
}

async function acquireOrderLock(orderId: string, firebaseUid: string, action: string): Promise<LockInfo> {
  const client = await pgPool.connect();
  try {
    const result = await client.query(
      `INSERT INTO order_locks (order_id, locked_by, action, locked_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (order_id) DO UPDATE 
       SET locked_by = EXCLUDED.locked_by, action = EXCLUDED.action, locked_at = EXCLUDED.locked_at
       WHERE order_locks.locked_at < NOW() - INTERVAL '30 seconds'
       RETURNING order_id`,
      [orderId, firebaseUid, action]
    );

    if (result.rows.length > 0) {
      return { success: true };
    }

    const lockDetails = await client.query(
      `SELECT l.action, l.locked_at, EXTRACT(EPOCH FROM (NOW() - l.locked_at)) as age_seconds, l.locked_by
       FROM order_locks l
       WHERE l.order_id = $1`,
      [orderId]
    );

    if (lockDetails.rows.length > 0) {
      const lock = lockDetails.rows[0];
      const isDuplicate = lock.action === action && lock.age_seconds < 5;
      
      return {
        success: false,
        duplicate: isDuplicate,
        reason: isDuplicate ? 'Duplicate request ignored' : 'Another user is processing this order',
        locked_by_name: lock.locked_by || 'Unknown',
        locked_at: lock.locked_at,
        action: lock.action,
        age_seconds: Math.round(lock.age_seconds)
      };
    }
    return { success: false, reason: 'Failed to acquire lock for unknown reason' };
  } catch (e: any) {
    return { success: false, reason: `Database error: ${e.message}` };
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
  const isDebug = req.headers['x-debug-mode'] === 'true';
  const startTime = Date.now();
  const trace: any = { route: 'POST /api/notifications/action', action, orderId, userId, steps: [] };

  if (!orderId || !action) {
    trace.steps.push({ step: 'Validation', status: 'failed', reason: 'Missing orderId or action' });
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

  // ── Pre-check: Order Status ─────────────────────────────────────────────
  const preCheckDoc = await db.collection('orders').doc(orderId).get();
  const orderStatusPreCheck = preCheckDoc.exists ? preCheckDoc.data()?.status : null;

  if (orderStatusPreCheck && ['delivered', 'completed', 'cancelled', 'rejected'].includes(orderStatusPreCheck)) {
    if (isDebug) trace.steps.push({ step: 'Terminal State Check', status: 'failed', reason: `Order is already ${orderStatusPreCheck}` });
    res.status(200).json({ success: false, message: `Order already ${orderStatusPreCheck}`, trace: isDebug ? trace : undefined });
    return;
  }

  // ── Order Locking: prevent race conditions ──────────────────────────────
  const lockInfo = await acquireOrderLock(orderId, userId, action);
  if (!lockInfo.success) {
    if (lockInfo.duplicate) {
      // Safely ignore duplicate requests (e.g. double click)
      if (isDebug) trace.steps.push({ step: 'Idempotency Lock', status: 'success', info: 'Duplicate request safely ignored' });
      res.status(200).json({ success: true, duplicate: true, message: lockInfo.reason, trace: isDebug ? trace : undefined });
      return;
    }

    if (isDebug) trace.steps.push({ 
      step: 'Idempotency Lock', 
      status: 'failed', 
      reason: lockInfo.reason,
      lockOwner: lockInfo.locked_by_name,
      lockAge: lockInfo.age_seconds ? `${lockInfo.age_seconds}s` : undefined,
      lockedAction: lockInfo.action
    });
    res.status(409).json({ 
      error: lockInfo.reason || 'Order is currently being processed by another request', 
      trace: isDebug ? trace : undefined 
    });
    return;
  }

  
  const orderDoc = await db.collection('orders').doc(orderId).get();
  if (!orderDoc.exists) {
    await releaseOrderLock(orderId);
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  const order = orderDoc.data()!;
  const orderData = order;
  const customerFirebaseUid = order.userId;
  const backgroundTasks: (() => Promise<void>)[] = [];
  let newStatus = order.status;
  let responseData: any = {};
  let isIndependentTransaction = true; // All use orderEventService now

    const shortId = orderData.dailyOrderNumber || `#${orderId.slice(-6).toUpperCase()}`;
    let newStatus = order.status;
    let responseData: any = {};
    let isIndependentTransaction = false;

    // ─── State Machine ─────────────────────────────────────────────────────
    if (action === 'accept' && currentStage === 'new_order' && userRole === 'owner') {
       // Release lock — OrderEventService handles its own transaction
      isIndependentTransaction = true;
      const event = await orderEventService.emitStatusChange(orderId, 'accepted', userId, { eta: '20-30 mins' });
      if (!event) {
        if (isDebug) trace.steps.push({ step: 'Postgres Write', status: 'failed', reason: 'Invalid transition' });
        res.status(409).json({ error: 'Invalid state transition or order not found', trace: isDebug ? trace : undefined });
        return;
      }
      newStatus = 'accepted';
      const ev = event!;

      backgroundTasks.push(async () => {
        if (ev.order.firebaseUid) {
          const payload = CustomerTemplates.orderUpdate(orderId, {
            orderNumber: ev.order.orderNumber, status: 'accepted', totalAmount: ev.order.totalAmount,
            eta: '20-30 mins', version: ev.version,
            eventId: ev.eventId, previousStatus: ev.previousStatus || undefined, eventTimestamp: ev.eventTimestamp,
          });
          const cTrace = await directNotification.sendPush(ev.order.firebaseUid, payload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: ev.version });
          trace.steps.push({ step: 'Customer Notification', status: 'success', trace: cTrace });
        }
        const ownerIds = await getOwnerUserIds();
        const ownerPayload = OwnerTemplates.orderStatusUpdate(orderId, {
          orderNumber: ev.order.orderNumber, customerName: ev.order.contactPhone,
          status: 'accepted', totalAmount: ev.order.totalAmount, version: ev.version,
          eventId: ev.eventId, previousStatus: ev.previousStatus || undefined, eventTimestamp: ev.eventTimestamp,
        });
        const oTrace = await directNotification.sendBulkPush(ownerIds, ownerPayload, 'normal', { tag: `order_owner_${orderId}`, orderId, category: 'order', version: ev.version });
        trace.steps.push({ step: 'Owner Notifications', status: 'success', recipients: ownerIds.length, trace: oTrace });
      });
      
      responseData = { message: 'Order accepted' };
    }

    else if (action === 'reject' && userRole === 'owner') {
      newStatus = 'cancelled';
      await transactionClient.query("UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1", [orderId]);

      backgroundTasks.push(async () => {
        if (customerFirebaseUid) {
          const payload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'cancelled', totalAmount: Number(order.total_amount), version: 2 });
          await directNotification.sendPush(customerFirebaseUid, payload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 2 });
        }
        const ownerIds = await getOwnerUserIds();
        const ownerPayload = OwnerTemplates.orderStatusUpdate(orderId, {
          orderNumber: shortId, customerName: String(order.contact_phone),
          status: 'cancelled', totalAmount: Number(order.total_amount), version: 2,
        });
        for (const oid of ownerIds) {
          await directNotification.sendPush(oid, ownerPayload, 'normal', { tag: `order_owner_${orderId}`, orderId, category: 'order', version: 2 });
        }
      });

      responseData = { message: 'Order rejected' };
    }

    else if (action === 'start_cooking' && userRole === 'owner') {
      newStatus = 'preparing';
      await transactionClient.query("UPDATE orders SET status = 'preparing', updated_at = NOW() WHERE id = $1", [orderId]);

      backgroundTasks.push(async () => {
        if (customerFirebaseUid) {
          const payload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'preparing', totalAmount: Number(order.total_amount), version: 3 });
          await directNotification.sendPush(customerFirebaseUid, payload, 'normal', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 3 });
        }
      });
      responseData = { message: 'Cooking started' };
    }

    else if (action === 'ready' && userRole === 'owner') {
      newStatus = 'ready';
      await transactionClient.query("UPDATE orders SET status = 'ready', updated_at = NOW() WHERE id = $1", [orderId]);

      backgroundTasks.push(async () => {
        if (customerFirebaseUid) {
          const payload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'ready', totalAmount: Number(order.total_amount), version: 4 });
          await directNotification.sendPush(customerFirebaseUid, payload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 4 });
        }
      });
      responseData = { message: 'Order marked ready' };
    }

    else if (action === 'assign_delivery' && userRole === 'owner' && partnerId) {
      const partnerResult = await transactionClient.query(
        "SELECT user_id as firebase_uid FROM fcm_tokens WHERE user_id = $1",
        [partnerId]
      );
      if (partnerResult.rows.length === 0) {
        
        res.status(400).json({ error: 'Invalid delivery partner' });
        return;
      }
      const partner = partnerResult.rows[0];

      newStatus = 'partner_assigned';
      await transactionClient.query(
        "UPDATE orders SET status = 'partner_assigned', delivery_partner_id = $1, updated_at = NOW() WHERE id = $2",
        [partnerId, orderId]
      );

      backgroundTasks.push(async () => {
        const deliveryPayload = DeliveryTemplates.newAssignment(orderId, {
          orderNumber: shortId, customerName: 'Customer', customerPhone: order.contact_phone,
          deliveryAddress: order.delivery_address_line, distance: '?', eta: '15 mins',
          totalAmount: Number(order.total_amount), paymentMethod: 'COD', version: 1
        });
        await directNotification.sendPush(partner.firebase_uid, deliveryPayload, 'high', { tag: `order_delivery_${orderId}`, orderId, category: 'delivery', priority: 'critical', version: 1 });

        if (customerFirebaseUid) {
          const cPayload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'partner_assigned', totalAmount: Number(order.total_amount), deliveryPartnerName: partner.name || 'Partner', version: 5 });
          await directNotification.sendPush(customerFirebaseUid, cPayload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 5 });
        }
      });
      responseData = { message: 'Partner assigned' };
    }

    else if (action === 'accept_delivery' && userRole === 'delivery') {
      if (order.delivery_partner_id !== userId) {
        
        res.status(403).json({ error: 'You are not assigned to this order' });
        return;
      }
      backgroundTasks.push(async () => {
        const dPayload = DeliveryTemplates.deliveryUpdate(orderId, { orderNumber: shortId, customerName: 'Customer', deliveryAddress: order.delivery_address_line, stage: 'navigate_restaurant', version: 2 });
        await directNotification.sendPush(userId, dPayload, 'high', { tag: `order_delivery_${orderId}`, orderId, category: 'delivery', version: 2 });
      });
      responseData = { message: 'Delivery accepted' };
    }

    else if (action === 'picked_up' && userRole === 'delivery') {
      newStatus = 'out_for_delivery';
      await transactionClient.query("UPDATE orders SET status = 'out_for_delivery', updated_at = NOW() WHERE id = $1", [orderId]);

      backgroundTasks.push(async () => {
        const dPayload = DeliveryTemplates.deliveryUpdate(orderId, { orderNumber: shortId, customerName: 'Customer', deliveryAddress: order.delivery_address_line, stage: 'out_for_delivery', version: 3 });
        await directNotification.sendPush(userId, dPayload, 'high', { tag: `order_delivery_${orderId}`, orderId, category: 'delivery', version: 3 });

        if (customerFirebaseUid) {
          const cPayload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'out_for_delivery', totalAmount: Number(order.total_amount), version: 6 });
          await directNotification.sendPush(customerFirebaseUid, cPayload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 6 });
        }
      });
      responseData = { message: 'Picked up — out for delivery' };
    }

    else if (action === 'delivered' && userRole === 'delivery') {
      const { deliveryProof } = req.body;
      
      isIndependentTransaction = true;
      const event = await orderEventService.emitStatusChange(orderId, 'delivered', userId);
      
      if (!event) {
        res.status(409).json({ error: 'Invalid state transition' });
        return;
      }
      newStatus = 'delivered';
      const ev = event!;

      backgroundTasks.push(async () => {
        if (deliveryProof) {
          try {
            await db.collection('orders').doc(orderId).update({
              deliveryProof,
              deliveredAt: new Date().toISOString()
            });
          } catch (e) {
            console.error("Failed to save delivery proof", e);
          }
        }

        if (ev.order.firebaseUid) {
          const cPayload = CustomerTemplates.orderUpdate(orderId, {
            orderNumber: ev.order.orderNumber, status: 'delivered', totalAmount: ev.order.totalAmount,
            version: ev.version, eventId: ev.eventId, previousStatus: ev.previousStatus || undefined, eventTimestamp: ev.eventTimestamp,
          });
          await directNotification.sendPush(ev.order.firebaseUid, cPayload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: ev.version });

          const userDoc2 = await db.collection('users').doc(ev.order.userId).get();
          const userRes2 = { rows: [userDoc2.data() || {}] };
          const userEmail = userRes2.rows[0]?.email;
          const userName  = userRes2.rows[0]?.name || 'Customer';
          if (userEmail) {
            const subject = `Your order has been delivered! — #${ev.order.orderNumber}`;
            const htmlBody = buildOrderStatusEmail({
              customerName: userName, subject, stage: 'delivered',
              orderId, data: { orderNumber: ev.order.orderNumber, totalAmount: String(ev.order.totalAmount) },
            });
            queueEmail(userEmail, subject, htmlBody, 'transactional').catch(console.error);
            console.log(`[NotifRoutes] 📧 Delivered email queued → ${userEmail}`);
          }
        }

        const ownerIds = await getOwnerUserIds();
        for (const ownerId of ownerIds) {
          const oPayload = OwnerTemplates.orderStatusUpdate(orderId, {
            orderNumber: ev.order.orderNumber, customerName: ev.order.contactPhone,
            status: 'delivered', totalAmount: ev.order.totalAmount, version: ev.version,
            eventId: ev.eventId, previousStatus: ev.previousStatus || undefined, eventTimestamp: ev.eventTimestamp,
          });
          await directNotification.sendPush(ownerId, oPayload, 'normal', { tag: `order_owner_${orderId}`, orderId, category: 'order', version: ev.version });
        }
      });
      responseData = { message: 'Delivered — order complete' };
    }

    else if (action === 'stop_alert') {
      backgroundTasks.push(async () => {
        const stopPayload = {
          notification: { title: '', body: '' },
          data: { action: 'STOP_ALERT', orderId, stage: currentStage, category: 'system' }
        };
        await directNotification.sendPush(userId, { notification: { title: 'Stop Alert', body: '' }, data: stopPayload.data }, 'high', { tag: `stop_alert_${orderId}`, orderId, category: 'system' });
      });
      responseData = { message: 'Alert stopped' };
    }

    else {
      
      trace.steps.push({ step: 'Validation', status: 'failed', reason: `Unknown action "${action}" for role "${userRole}"` });
      res.status(400).json({ error: `Unknown action "${action}" for role "${userRole}" at stage "${currentStage}"`, trace: isDebug ? trace : undefined });
      return;
    }

    // 🔥 Commit transaction IMMEDIATELY to free DB locks
    if (!isIndependentTransaction) {
      
      trace.steps.push({ step: 'Postgres Commit', status: 'success' });
    }
    
    // Release idempotency lock immediately
    await releaseOrderLock(orderId);
    lockReleased = true;

    // Send HTTP response instantly to unblock UI
    trace.processingTime = Date.now() - startTime;
    res.json({ success: true, newStatus, ...responseData, trace: isDebug ? trace : undefined });

    // 🔥 Execute all background tasks with timeouts
    if (action !== 'accept' && action !== 'delivered' && action !== 'stop_alert') {
      backgroundTasks.unshift(async () => {
        try {
          await db.collection('orders').doc(orderId).update({ status: newStatus, updatedAt: new Date() });
          trace.steps.push({ step: 'Firestore Sync', status: 'success' });
        } catch (fErr: any) {
          trace.steps.push({ step: 'Firestore Sync', status: 'failed', error: fErr.message });
          console.error('[NotificationRoutes] Firestore sync failed in background:', fErr);
        }
      });
    }

    if (backgroundTasks.length > 0) {
      Promise.allSettled(backgroundTasks.map(task => withTimeout(task(), 5000, 'background_task')))
        .then(results => {
          results.forEach(res => {
            if (res.status === 'rejected') {
              console.error('[NotificationRoutes] Background task rejected or timed out:', res.reason);
            }
          });
        });
    }

  } catch (error: any) {
    if (!lockReleased) {
      await transactionClient.query('ROLLBACK').catch(() => {});
    }
    console.error('[NotificationRoutes] Action error:', error);
    trace.steps.push({ step: 'Fatal Error', status: 'failed', error: error.message });
    trace.processingTime = Date.now() - startTime;
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error', details: error.message, trace: isDebug ? trace : undefined });
    }
  } finally {
    
    if (!lockReleased) {
      await releaseOrderLock(orderId);
    }
  }
});

// ─── Helper: Get customer firebase UID from order ─────────────────────────────
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
    let queryText = 'SELECT user_id as firebase_uid FROM fcm_tokens';
    
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

    // Extract an array of firebase UIDs
    const targetUids = pgUsers.map(row => row.firebase_uid);

    // Build common payload
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

    // Dispatch a single bulk push (fire and forget for massive blasts so the HTTP response is instant)
    directNotification.sendBulkPush(targetUids, payload, 'normal', {
      category: category || 'marketing',
    }).catch(err => console.error('[NotificationRoutes] sendBulkPush failed:', err));

    res.json({ success: true, message: `Dispatched notifications to ${targetUids.length} users` });
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
      const [analytics, queueStats, tokenStats, deliveryLogs, activeOrders] = await Promise.all([
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
        client.query(
          `SELECT id, target_user_id, status, error_message, retry_count, created_at, updated_at 
           FROM notification_queue 
           ORDER BY created_at DESC LIMIT 50`
        ),
        client.query(
          `SELECT COUNT(*) as count FROM orders WHERE status NOT IN ('delivered', 'completed', 'cancelled')`
        ),
      ]);

      res.json({
        analytics: analytics.rows,
        queue: queueStats.rows,
        tokens: tokenStats.rows,
        logs: deliveryLogs.rows,
        activeOrders: parseInt(activeOrders.rows[0].count, 10) || 0,
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
// GET /notifications/debug
// Provide comprehensive diagnostics for the Owner Dashboard
// =============================================================================
router.get('/debug', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const pgClient = await pgPool.connect();
  try {
    const queueRes = await pgClient.query("SELECT COUNT(*) as count FROM notification_queue WHERE status = 'queued'");
    const failedRes = await pgClient.query("SELECT COUNT(*) as count FROM notification_history WHERE status = 'failed'");
    const avgRes = await pgClient.query("SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_sec FROM notification_queue WHERE status = 'sent'");

    // Background Tasks Diagnostics
    const bgPendingRes = await pgClient.query("SELECT COUNT(*) as count FROM background_tasks WHERE status = 'pending'");
    const bgProcessingRes = await pgClient.query("SELECT COUNT(*) as count FROM background_tasks WHERE status = 'processing'");
    const bgFailedRes = await pgClient.query("SELECT COUNT(*) as count FROM background_tasks WHERE status = 'failed'");
    const bgCompletedRes = await pgClient.query("SELECT COUNT(*) as count FROM background_tasks WHERE status = 'completed'");
    const bgRecentErrorsRes = await pgClient.query("SELECT order_id, task_type, last_error, retry_count, created_at FROM background_tasks WHERE status = 'failed' ORDER BY created_at DESC LIMIT 5");

    res.json({
      queueSize: parseInt(queueRes.rows[0].count, 10),
      failedNotifications: parseInt(failedRes.rows[0].count, 10),
      averageDeliveryTimeSec: parseFloat(avgRes.rows[0].avg_sec || '0').toFixed(2),
      backgroundTasks: {
        pending: parseInt(bgPendingRes.rows[0].count, 10),
        processing: parseInt(bgProcessingRes.rows[0].count, 10),
        failed: parseInt(bgFailedRes.rows[0].count, 10),
        completed: parseInt(bgCompletedRes.rows[0].count, 10),
        recentErrors: bgRecentErrorsRes.rows
      },
      currentFrontendUrl: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://olive-pizza.vercel.app' : 'http://localhost:5173'),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  } finally {
    pgClient.release();
  }
});


// =============================================================================
// POST /notifications/test-center
// Dedicated endpoint for testing the entire notification pipeline
// =============================================================================
router.post('/test-center', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const ownerDoc = await db.collection('users').doc(userId).get();
    if (!ownerDoc.exists || ownerDoc.data()?.role !== 'owner') {
      res.status(403).json({ error: 'Owner access required' });
      return;
    }

    const { action, targetUserId, delayMs } = req.body;
    let payload: any = {};
    const tag = `test_center_${Date.now()}`;

    // Basic payload builder for tests
    const buildPayload = (title: string, body: string, isAlarm: boolean = false) => {
      const p: any = {
        notification: { title, body },
        data: { category: 'test', action: 'test_action' }
      };
      if (isAlarm) {
        p.data.alert = 'continuous';
        p.data.sound = 'order_alert.mp3';
        p.android = { priority: 'high' };
      }
      return p;
    };

    let targetId = targetUserId || userId;

    if (action === 'owner') {
      payload = buildPayload('Test Owner Notification', 'This is a standard push for the owner.');
    } else if (action === 'customer') {
      payload = buildPayload('Test Customer Notification', 'This is a standard push for the customer.');
      payload.data.role = 'customer';
    } else if (action === 'delivery') {
      payload = buildPayload('Test Delivery Notification', 'This is a standard push for the delivery partner.');
      payload.data.role = 'delivery';
    } else if (action === 'alarm') {
      payload = buildPayload('🚨 TEST ALARM 🚨', 'This should trigger the continuous ringtone and WakeLock.', true);
    } else if (action === 'force_email') {
      // Simulate by targeting a non-existent UID or removing tokens
      payload = buildPayload('Email Fallback Test', 'This should fail FCM and fall back to email immediately.');
      payload.data.role = 'customer'; 
      payload.data.stage = 'update'; // Non-always stage
      // Target a fake UUID to ensure 0 tokens
      targetId = '00000000-0000-0000-0000-000000000000';
    } else {
      res.status(400).json({ error: 'Unknown test action' });
      return;
    }

    if (delayMs && delayMs > 0) {
      setTimeout(() => {
        directNotification.sendPush(targetId, payload, 'high', { tag, category: 'test' }).catch(console.error);
      }, delayMs);
      res.json({ success: true, message: `Scheduled ${action} with ${delayMs}ms delay.` });
    } else {
      const queueId = await directNotification.sendPush(targetId, payload, 'high', { tag, category: 'test' });
      res.json({ success: true, queueId, message: `Queued ${action} immediately.` });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
