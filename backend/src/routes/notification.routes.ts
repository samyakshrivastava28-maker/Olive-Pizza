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

// ─── Helper: Resolve user's Postgres UUID from Firebase UID ───────────────────
const getPostgresUserId = async (uid: string) => uid;
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
// Owner/Delivery quick actions — handles Accept, Reject, Start Cooking, etc.
// CRITICAL FLOW: Firestore write is SYNCHRONOUS before HTTP 200.
// Notifications/emails/analytics are fire-and-forget background tasks.
// =============================================================================
router.post('/action', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const { orderId, action, currentStage, partnerId } = req.body;
  const userId = req.user!.uid;
  const isDebug = req.headers['x-debug-mode'] === 'true';
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const trace: any = { requestId, route: 'POST /api/notifications/action', action, orderId, userId, currentStage, steps: [] };

  console.log(`[Action][${requestId}] START action=${action} orderId=${orderId} userId=${userId} currentStage=${currentStage}`);

  if (!orderId || !action) {
    const reason = !orderId ? 'Missing orderId' : 'Missing action';
    trace.steps.push({ step: 'Validation', status: 'failed', reason });
    console.warn(`[Action][${requestId}] Validation failed: ${reason}`);
    res.status(400).json({ error: reason, requestId });
    return;
  }

  // ── Step 1: Verify user exists and has a role ──────────────────────────
  let userRole: string;
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.warn(`[Action][${requestId}] User not found in Firestore: ${userId}`);
      res.status(403).json({ error: 'Unauthorized: user not found', requestId });
      return;
    }
    userRole = userDoc.data()?.role as string;
    trace.steps.push({ step: 'Auth Check', status: 'success', role: userRole, ms: Date.now() - startTime });
    console.log(`[Action][${requestId}] Auth OK. role=${userRole}`);
  } catch (authErr: any) {
    console.error(`[Action][${requestId}] Auth check failed:`, authErr.message);
    res.status(500).json({ error: 'Authentication check failed', details: authErr.message, requestId });
    return;
  }

  // ── Step 2: Pre-check terminal order states ─────────────────────────────
  try {
    const preCheckDoc = await db.collection('orders').doc(orderId).get();
    const orderStatusPreCheck = preCheckDoc.exists ? preCheckDoc.data()?.status : null;
    if (!preCheckDoc.exists) {
      console.warn(`[Action][${requestId}] Order ${orderId} not found in pre-check`);
      res.status(404).json({ error: 'Order not found', requestId });
      return;
    }
    if (['delivered', 'completed', 'cancelled', 'rejected'].includes(orderStatusPreCheck)) {
      trace.steps.push({ step: 'Terminal State Check', status: 'blocked', reason: `Order already ${orderStatusPreCheck}` });
      console.log(`[Action][${requestId}] Order already in terminal state: ${orderStatusPreCheck}`);
      res.status(200).json({ success: false, message: `Order already ${orderStatusPreCheck}`, requestId, trace: isDebug ? trace : undefined });
      return;
    }
    trace.steps.push({ step: 'Terminal State Check', status: 'success', currentStatus: orderStatusPreCheck, ms: Date.now() - startTime });
  } catch (preCheckErr: any) {
    console.error(`[Action][${requestId}] Pre-check Firestore read failed:`, preCheckErr.message);
    res.status(500).json({ error: 'Failed to read order status', details: preCheckErr.message, requestId });
    return;
  }

  // ── Step 3: Acquire Order Lock ──────────────────────────────────────────
  let lockAcquired = false;
  try {
    const lockInfo = await acquireOrderLock(orderId, userId, action);
    if (!lockInfo.success) {
      if (lockInfo.duplicate) {
        trace.steps.push({ step: 'Idempotency Lock', status: 'success', info: 'Duplicate request safely ignored' });
        console.log(`[Action][${requestId}] Duplicate request ignored for orderId=${orderId}`);
        res.status(200).json({ success: true, duplicate: true, message: lockInfo.reason, requestId, trace: isDebug ? trace : undefined });
        return;
      }
      trace.steps.push({ step: 'Idempotency Lock', status: 'failed', reason: lockInfo.reason });
      console.warn(`[Action][${requestId}] Lock failed: ${lockInfo.reason}`);
      res.status(409).json({ error: lockInfo.reason || 'Order is currently being processed', requestId, trace: isDebug ? trace : undefined });
      return;
    }
    lockAcquired = true;
    trace.steps.push({ step: 'Order Lock', status: 'acquired', ms: Date.now() - startTime });
    console.log(`[Action][${requestId}] Lock acquired for orderId=${orderId}`);
  } catch (lockErr: any) {
    console.error(`[Action][${requestId}] Lock acquisition error:`, lockErr.message);
    res.status(500).json({ error: 'Failed to acquire order lock', details: lockErr.message, requestId });
    return;
  }

  let lockReleased = false;

  try {
    // ── Step 4: Read full order from Firestore ─────────────────────────────
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      console.warn(`[Action][${requestId}] Order ${orderId} not found`);
      await releaseOrderLock(orderId);
      lockReleased = true;
      res.status(404).json({ error: 'Order not found', requestId });
      return;
    }
    const orderData = orderDoc.data()!;
    const currentStatus = orderData.status as string;
    const customerFirebaseUid = orderData.userId;
    const shortId = orderData.dailyOrderNumber || `#${orderId.slice(-6).toUpperCase()}`;
    trace.steps.push({ step: 'Firestore Read', status: 'success', currentStatus, ms: Date.now() - startTime });
    console.log(`[Action][${requestId}] Order read. currentStatus=${currentStatus}`);

    const backgroundTasks: (() => Promise<void>)[] = [];
    let newStatus = currentStatus;
    let responseData: any = {};
    let firestoreWriteRequired = false;
    let firestoreUpdates: Record<string, any> = {};

    // ── Step 5: State Machine Validation & Business Logic ─────────────────
    // Allowed transitions per action (enforced on server, regardless of what client sends)
    const OWNER_TRANSITIONS: Record<string, { from: string[], to: string }> = {
      accept:          { from: ['pending', 'new_order'], to: 'accepted' },
      reject:          { from: ['pending', 'new_order', 'accepted', 'preparing', 'ready', 'partner_assigned'], to: 'cancelled' },
      start_cooking:   { from: ['accepted'], to: 'preparing' },
      ready:           { from: ['preparing'], to: 'ready' },
      assign_delivery: { from: ['preparing', 'ready'], to: 'partner_assigned' },
    };

    // ── OWNER ACTIONS ──────────────────────────────────────────────────────
    if (userRole === 'owner') {
      const actionDef = OWNER_TRANSITIONS[action];

      if (!actionDef) {
        trace.steps.push({ step: 'State Machine', status: 'failed', reason: `Unknown owner action: ${action}` });
        console.warn(`[Action][${requestId}] Unknown owner action: ${action}`);
        await releaseOrderLock(orderId);
        lockReleased = true;
        res.status(400).json({ error: `Unknown action "${action}" for role "owner"`, allowedActions: Object.keys(OWNER_TRANSITIONS), requestId });
        return;
      }

      if (!actionDef.from.includes(currentStatus)) {
        const reason = `Cannot perform "${action}" when order is "${currentStatus}". Allowed from: [${actionDef.from.join(', ')}]`;
        trace.steps.push({ step: 'State Machine', status: 'failed', reason });
        console.warn(`[Action][${requestId}] Invalid transition: ${reason}`);
        await releaseOrderLock(orderId);
        lockReleased = true;
        res.status(409).json({ error: reason, currentStatus, action, requestId, trace: isDebug ? trace : undefined });
        return;
      }

      newStatus = actionDef.to;
      trace.steps.push({ step: 'State Machine', status: 'success', transition: `${currentStatus} → ${newStatus}`, ms: Date.now() - startTime });
      console.log(`[Action][${requestId}] Transition validated: ${currentStatus} → ${newStatus}`);

      // Build Firestore updates
      firestoreWriteRequired = true;
      firestoreUpdates = { status: newStatus, updatedAt: new Date() };

      if (action === 'assign_delivery') {
        if (!partnerId) {
          await releaseOrderLock(orderId);
          lockReleased = true;
          res.status(400).json({ error: 'partnerId is required for assign_delivery', requestId });
          return;
        }
        firestoreUpdates.deliveryPartnerId = partnerId;
        firestoreUpdates.delivery_partner_id = partnerId;

        backgroundTasks.push(async () => {
          try {
            const deliveryPayload = DeliveryTemplates.newAssignment(orderId, {
              orderNumber: shortId, customerName: 'Customer', customerPhone: orderData.contactPhone || orderData.contact_phone,
              deliveryAddress: orderData.deliveryAddress?.addressLine || orderData.delivery_address_line || 'Address not provided',
              distance: '?', eta: '15 mins', totalAmount: Number(orderData.totalAmount || orderData.total_amount || 0),
              paymentMethod: orderData.paymentMethod || 'COD', version: 1
            });
            await directNotification.sendPush(partnerId, deliveryPayload, 'high', { tag: `order_delivery_${orderId}`, orderId, category: 'delivery', priority: 'critical', version: 1 });
          } catch (notifErr: any) {
            console.error(`[Action][${requestId}] Delivery partner notification failed (non-blocking):`, notifErr.message);
          }
          try {
            if (customerFirebaseUid) {
              const cPayload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'partner_assigned', totalAmount: Number(orderData.totalAmount || orderData.total_amount || 0), deliveryPartnerName: 'Partner', version: 5 });
              await directNotification.sendPush(customerFirebaseUid, cPayload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 5 });
            }
          } catch (notifErr: any) {
            console.error(`[Action][${requestId}] Customer notification failed (non-blocking):`, notifErr.message);
          }
        });
      } else if (action === 'accept') {
        firestoreUpdates.acceptedAt = new Date().toISOString();
        firestoreUpdates.eta = '20-30 mins';
        backgroundTasks.push(async () => {
          try {
            if (customerFirebaseUid) {
              const payload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'accepted', totalAmount: Number(orderData.totalAmount || orderData.total_amount || 0), eta: '20-30 mins', version: 2 });
              await directNotification.sendPush(customerFirebaseUid, payload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 2 });
            }
          } catch (notifErr: any) {
            console.error(`[Action][${requestId}] Accept customer notification failed (non-blocking):`, notifErr.message);
          }
          try {
            const ownerIds = await getOwnerUserIds();
            const ownerPayload = OwnerTemplates.orderStatusUpdate(orderId, { orderNumber: shortId, customerName: orderData.contactPhone || '', status: 'accepted', totalAmount: Number(orderData.totalAmount || orderData.total_amount || 0), version: 2 });
            await directNotification.sendBulkPush(ownerIds, ownerPayload, 'normal', { tag: `order_owner_${orderId}`, orderId, category: 'order', version: 2 });
          } catch (notifErr: any) {
            console.error(`[Action][${requestId}] Accept owner notification failed (non-blocking):`, notifErr.message);
          }
        });
      } else if (action === 'reject') {
        firestoreUpdates.cancelledAt = new Date().toISOString();
        backgroundTasks.push(async () => {
          try {
            if (customerFirebaseUid) {
              const payload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'cancelled', totalAmount: Number(orderData.totalAmount || orderData.total_amount || 0), version: 2 });
              await directNotification.sendPush(customerFirebaseUid, payload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 2 });
            }
          } catch (notifErr: any) {
            console.error(`[Action][${requestId}] Reject notification failed (non-blocking):`, notifErr.message);
          }
        });
      } else if (action === 'start_cooking') {
        firestoreUpdates.preparingAt = new Date().toISOString();
        backgroundTasks.push(async () => {
          try {
            if (customerFirebaseUid) {
              const payload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'preparing', totalAmount: Number(orderData.totalAmount || orderData.total_amount || 0), version: 3 });
              await directNotification.sendPush(customerFirebaseUid, payload, 'normal', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 3 });
            }
          } catch (notifErr: any) {
            console.error(`[Action][${requestId}] Start cooking notification failed (non-blocking):`, notifErr.message);
          }
        });
      } else if (action === 'ready') {
        firestoreUpdates.readyAt = new Date().toISOString();
        backgroundTasks.push(async () => {
          try {
            if (customerFirebaseUid) {
              const payload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'ready', totalAmount: Number(orderData.totalAmount || orderData.total_amount || 0), version: 4 });
              await directNotification.sendPush(customerFirebaseUid, payload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 4 });
            }
          } catch (notifErr: any) {
            console.error(`[Action][${requestId}] Ready notification failed (non-blocking):`, notifErr.message);
          }
        });
      }

      responseData = { message: `Order ${action === 'reject' ? 'rejected' : action === 'accept' ? 'accepted' : action === 'assign_delivery' ? 'partner assigned' : newStatus}` };
    }

    // ── DELIVERY ACTIONS ───────────────────────────────────────────────────
    else if (userRole === 'delivery') {
      if (action === 'accept_delivery') {
        if (orderData.delivery_partner_id !== userId && orderData.deliveryPartnerId !== userId) {
          await releaseOrderLock(orderId);
          lockReleased = true;
          console.warn(`[Action][${requestId}] Delivery partner ${userId} not assigned to order ${orderId}`);
          res.status(403).json({ error: 'You are not assigned to this order', requestId });
          return;
        }
        backgroundTasks.push(async () => {
          try {
            const dPayload = DeliveryTemplates.deliveryUpdate(orderId, { orderNumber: shortId, customerName: 'Customer', deliveryAddress: orderData.deliveryAddress?.addressLine || orderData.delivery_address_line || '', stage: 'navigate_restaurant', version: 2 });
            await directNotification.sendPush(userId, dPayload, 'high', { tag: `order_delivery_${orderId}`, orderId, category: 'delivery', version: 2 });
          } catch (notifErr: any) {
            console.error(`[Action][${requestId}] Accept delivery notification failed (non-blocking):`, notifErr.message);
          }
        });
        responseData = { message: 'Delivery accepted' };
      } else if (action === 'picked_up') {
        if (currentStatus !== 'partner_assigned') {
          await releaseOrderLock(orderId);
          lockReleased = true;
          res.status(409).json({ error: `Cannot pick up order with status "${currentStatus}". Must be "partner_assigned".`, requestId });
          return;
        }
        newStatus = 'out_for_delivery';
        firestoreWriteRequired = true;
        firestoreUpdates = { status: newStatus, updatedAt: new Date(), pickedUpAt: new Date().toISOString() };
        backgroundTasks.push(async () => {
          try {
            const dPayload = DeliveryTemplates.deliveryUpdate(orderId, { orderNumber: shortId, customerName: 'Customer', deliveryAddress: orderData.deliveryAddress?.addressLine || orderData.delivery_address_line || '', stage: 'out_for_delivery', version: 3 });
            await directNotification.sendPush(userId, dPayload, 'high', { tag: `order_delivery_${orderId}`, orderId, category: 'delivery', version: 3 });
          } catch (notifErr: any) {
            console.error(`[Action][${requestId}] Picked up delivery notification failed (non-blocking):`, notifErr.message);
          }
          try {
            if (customerFirebaseUid) {
              const cPayload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'out_for_delivery', totalAmount: Number(orderData.totalAmount || orderData.total_amount || 0), version: 6 });
              await directNotification.sendPush(customerFirebaseUid, cPayload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 6 });
            }
          } catch (notifErr: any) {
            console.error(`[Action][${requestId}] Picked up customer notification failed (non-blocking):`, notifErr.message);
          }
        });
        responseData = { message: 'Picked up — out for delivery' };
      } else if (action === 'delivered') {
        if (currentStatus !== 'out_for_delivery') {
          await releaseOrderLock(orderId);
          lockReleased = true;
          res.status(409).json({ error: `Cannot deliver order with status "${currentStatus}". Must be "out_for_delivery".`, requestId });
          return;
        }
        const { deliveryProof } = req.body;
        newStatus = 'delivered';
        firestoreWriteRequired = true;
        firestoreUpdates = { status: newStatus, updatedAt: new Date(), deliveredAt: new Date().toISOString(), ...(deliveryProof ? { deliveryProof } : {}) };
        backgroundTasks.push(async () => {
          try {
            if (customerFirebaseUid) {
              const cPayload = CustomerTemplates.orderUpdate(orderId, { orderNumber: shortId, status: 'delivered', totalAmount: Number(orderData.totalAmount || orderData.total_amount || 0), version: 7 });
              await directNotification.sendPush(customerFirebaseUid, cPayload, 'high', { tag: `order_customer_${orderId}`, orderId, category: 'order', version: 7 });
              const userDoc2 = await db.collection('users').doc(customerFirebaseUid).get();
              const userRes2 = userDoc2.data() || {};
              const userEmail = userRes2.email;
              const userName = userRes2.name || 'Customer';
              if (userEmail) {
                const subject = `Your order has been delivered! — ${shortId}`;
                const htmlBody = buildOrderStatusEmail({ customerName: userName, subject, stage: 'delivered', orderId, data: { orderNumber: shortId, totalAmount: String(orderData.totalAmount || orderData.total_amount || 0) }, orderData: orderData });
                queueEmail(userEmail, subject, htmlBody, 'transactional').catch(e => console.error(`[Action][${requestId}] Email queue failed:`, e.message));
              }
            }
          } catch (notifErr: any) {
            console.error(`[Action][${requestId}] Delivered notification failed (non-blocking):`, notifErr.message);
          }
        });
        responseData = { message: 'Delivered — order complete' };
      } else {
        await releaseOrderLock(orderId);
        lockReleased = true;
        res.status(400).json({ error: `Unknown delivery action "${action}"`, allowedActions: ['accept_delivery', 'picked_up', 'delivered'], requestId });
        return;
      }
    }

    // ── SYSTEM ACTIONS ─────────────────────────────────────────────────────
    else if (action === 'stop_alert') {
      backgroundTasks.push(async () => {
        try {
          await directNotification.sendPush(userId, { notification: { title: 'Stop Alert', body: '' }, data: { action: 'STOP_ALERT', orderId, stage: currentStage, category: 'system' } }, 'high', { tag: `stop_alert_${orderId}`, orderId, category: 'system' });
        } catch (e: any) {
          console.error(`[Action][${requestId}] stop_alert push failed (non-blocking):`, e.message);
        }
      });
      await releaseOrderLock(orderId);
      lockReleased = true;
      res.json({ success: true, message: 'Alert stopped', requestId });
      return;
    }

    else {
      await releaseOrderLock(orderId);
      lockReleased = true;
      trace.steps.push({ step: 'Validation', status: 'failed', reason: `Unknown action "${action}" for role "${userRole}"` });
      res.status(400).json({ error: `Unknown action "${action}" for role "${userRole}"`, requestId, trace: isDebug ? trace : undefined });
      return;
    }

    // ── Step 6: SYNCHRONOUS Firestore Write (BEFORE returning HTTP 200) ────
    if (firestoreWriteRequired) {
      try {
        await db.collection('orders').doc(orderId).update(firestoreUpdates);
        trace.steps.push({ step: 'Firestore Write', status: 'success', newStatus, ms: Date.now() - startTime });
        console.log(`[Action][${requestId}] ✅ Firestore write SUCCESS. orderId=${orderId} newStatus=${newStatus} ms=${Date.now() - startTime}`);
      } catch (firestoreErr: any) {
        console.error(`[Action][${requestId}] ❌ Firestore write FAILED:`, firestoreErr.message);
        trace.steps.push({ step: 'Firestore Write', status: 'failed', error: firestoreErr.message });
        await releaseOrderLock(orderId);
        lockReleased = true;
        res.status(500).json({
          error: 'Order status update failed. Firestore write error.',
          details: firestoreErr.message,
          requestId,
          trace: isDebug ? trace : undefined
        });
        return;
      }
    }

    // ── Step 7: Release Lock ───────────────────────────────────────────────
    await releaseOrderLock(orderId);
    lockReleased = true;

    // ── Step 8: Return HTTP 200 ───────────────────────────────────────────
    trace.processingTime = Date.now() - startTime;
    console.log(`[Action][${requestId}] ✅ HTTP 200 sent. action=${action} newStatus=${newStatus} ms=${trace.processingTime}`);
    res.json({ success: true, newStatus, requestId, ...responseData, trace: isDebug ? trace : undefined });

    // ── Step 9: Background side-effects (AFTER HTTP 200 sent) ─────────────
    if (backgroundTasks.length > 0) {
      Promise.allSettled(backgroundTasks.map(task =>
        withTimeout(task(), 8000, 'background_task')
      )).then(results => {
        results.forEach((result, i) => {
          if (result.status === 'rejected') {
            console.error(`[Action][${requestId}] Background task[${i}] rejected or timed out:`, result.reason);
          }
        });
        console.log(`[Action][${requestId}] Background tasks settled: ${results.filter(r => r.status === 'fulfilled').length} ok, ${results.filter(r => r.status === 'rejected').length} failed`);
      }).catch(err => {
        console.error(`[Action][${requestId}] Background tasks Promise.allSettled error:`, err);
      });
    }

  } catch (error: any) {
    console.error(`[Action][${requestId}] ❌ Unhandled error: ${error.message}`, error.stack);
    trace.steps.push({ step: 'Fatal Error', status: 'failed', error: error.message, stack: error.stack });
    trace.processingTime = Date.now() - startTime;
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error', details: error.message, requestId, trace: isDebug ? trace : undefined });
    }
  } finally {
    if (!lockReleased) {
      try {
        await releaseOrderLock(orderId);
      } catch (lockReleaseErr: any) {
        console.error(`[Action][${requestId}] Failed to release lock in finally:`, lockReleaseErr.message);
      }
    }
  }
});

// ─── Helper: Get customer firebase UID from order ─────────────────────────────

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
        db.collection('orders').where('status', 'not-in', ['delivered', 'completed', 'cancelled']).count().get(),
      ]);

      res.json({
        analytics: analytics.rows,
        queue: queueStats.rows,
        tokens: tokenStats.rows,
        logs: deliveryLogs.rows,
        activeOrders: (activeOrders as admin.firestore.AggregateQuerySnapshot<{count: admin.firestore.AggregateField<number>}>).data().count || 0,
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
