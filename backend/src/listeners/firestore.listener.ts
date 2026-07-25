/**
 * Firestore Listener — uses Firebase Admin SDK (bypasses security rules)
 * This is the SINGLE SOURCE OF TRUTH for all order notifications.
 */
import { adminDb as db } from '../config/firebase.js';
import { pgPool } from '../config/postgres.js';
import { notificationService } from '../services/notification/notification.service.js';
import { SlackProvider } from '../services/notification/slack.provider.js';
import { notificationQueue } from '../services/notification/NotificationQueueService.js';
import { directNotification } from '../services/notification/DirectNotificationService.js';
import { OwnerTemplates, CustomerTemplates, DeliveryTemplates } from '../services/notification/NotificationTemplates.js';
import { queueEmail } from '../services/email.service.js';
import { buildOrderStatusEmail } from '../services/emailTemplates.service.js';
import { appEventBus } from '../services/eventBus/AppEventBus.js';

export class FirestoreListener {
  private static orderStatusCache = new Map<string, string>();
  private static processedOrderIds = new Set<string>();

  // Cleanup processedOrderIds every 30 min to prevent unbounded memory growth.
  // On Render, server rarely runs >24h without a deploy, but belt-and-suspenders.
  private static cleanupTimer = setInterval(() => {
    const beforeSize = FirestoreListener.processedOrderIds.size;
    FirestoreListener.processedOrderIds.clear();
    if (beforeSize > 0) {
      console.log(`[FirestoreListener] Cleared ${beforeSize} processed order IDs from dedup cache`);
    }
  }, 30 * 60 * 1000);

  static async init() {
    try {
      await this.hydrateActiveOrdersCache();
      this.listenToOrders();
      this.listenToActivityLogs();
      console.log('🎧 Firestore Listeners (Admin SDK) initialized for Unified Notifications.');
    } catch (err: any) {
      console.error('❌ Failed to initialize Firestore Listeners:', err.message || err);
    }
  }

  /**
   * Fix 4: Hydrate all active (non-terminal) orders into orderStatusCache at startup
   */
  private static async hydrateActiveOrdersCache() {
    try {
      const activeSnap = await db.collection('orders')
        .where('status', 'not-in', ['delivered', 'completed', 'cancelled'])
        .get();
      activeSnap.docs.forEach((doc: any) => {
        this.orderStatusCache.set(doc.id, doc.data()?.status);
      });
      console.log(`[FirestoreListener] Hydrated ${activeSnap.size} active order statuses into cache.`);
    } catch (err: any) {
      console.warn('[FirestoreListener] Active orders cache hydration notice:', err.message);
    }
  }

  /**
   * Fix 1: Unified Owner Recipient Resolution (Postgres fcm_tokens + Firestore users)
   */
  private static async getOwnerRecipients(): Promise<string[]> {
    try {
      let targetUids: string[] = [];
      const client = await pgPool.connect();
      try {
        const res = await client.query(
          "SELECT DISTINCT user_id as firebase_uid FROM fcm_tokens WHERE role = 'owner' OR role = 'admin' OR role IS NULL"
        );
        targetUids = res.rows.map((r: any) => r.firebase_uid);
      } finally {
        client.release();
      }

      const ownerDocs = await db.collection('users').where('role', 'in', ['owner', 'admin']).get();
      const fsUids = ownerDocs.docs.map(d => d.id);
      targetUids = Array.from(new Set([...targetUids, ...fsUids]));
      return targetUids;
    } catch (err: any) {
      console.error('[FirestoreListener] Owner recipient lookup error:', err.message);
      const ownerDocs = await db.collection('users').where('role', 'in', ['owner', 'admin']).get();
      return ownerDocs.docs.map(d => d.id);
    }
  }

  private static listenToOrders() {
    db.collection('orders').onSnapshot(
      async (snapshot: any) => {
        for (const change of snapshot.docChanges()) {
          const orderData = { id: change.doc.id, ...change.doc.data() } as any;

          // ── NEW ORDER ────────────────────────────────────────────────────────
          if (change.type === 'added') {
            let createdAt: Date = new Date();
            if (orderData.createdAt) {
              if (typeof orderData.createdAt?.toDate === 'function') {
                createdAt = orderData.createdAt.toDate();
              } else if (typeof orderData.createdAt === 'string' || typeof orderData.createdAt === 'number') {
                createdAt = new Date(orderData.createdAt);
              } else if (orderData.createdAt instanceof Date) {
                createdAt = orderData.createdAt;
              } else if (orderData.createdAt?._seconds) {
                createdAt = new Date(orderData.createdAt._seconds * 1000);
              }
            }
            if (isNaN(createdAt.getTime())) {
              createdAt = new Date();
            }

            // ALWAYS set status cache for state tracking, even for historical orders
            this.orderStatusCache.set(orderData.id, orderData.status);

            // Skip trigger push alarms for orders older than 10 min (server restart replay protection)
            if (Date.now() - createdAt.getTime() > 10 * 60 * 1000) continue;
            
            // Prevent duplicate triggers if we already processed this order creation
            if (this.processedOrderIds.has(orderData.id)) continue;
            this.processedOrderIds.add(orderData.id);

            const shortId = orderData.id.slice(-6).toUpperCase();
            const orderNumber = orderData.dailyOrderNumber
              ? `#${orderData.dailyOrderNumber}`
              : (orderData.dailyOrderNumber || orderData.daily_order_number || `OP-${shortId}`);
            const totalAmount = Number(orderData.totalAmount || orderData.total_amount || 0);
            
            // 1. SLACK NOTIFICATION
            console.log(`🍕 New order: ${orderNumber} — triggering Unified Pipeline`);
            const blocks = SlackProvider.generateOrderBlock(orderData);
            const ts = await notificationService.dispatchImmediate({
              type: orderData.orderTiming === 'scheduled' ? 'scheduled_order_received' : 'new_order',
              category: 'orders',
              title: `🍕 New Order — ${orderNumber}`,
              blocks,
            });
            if (ts) {
              try { await change.doc.ref.update({ slackThreadTs: ts }); } catch (e) {}
            }

            if (orderData.orderTiming === 'scheduled') continue; // Skip push alarms for scheduled until ready

            // FCM Push Notifications for New Order removed here per Spec §2.2 —
            // Handled directly & synchronously by NotificationEngine in POST /api/orders.

            // 2. EMAIL TO CUSTOMER & OWNER
            this.sendOrderEmail(orderData, 'pending');

            // 4. Emit AppEventBus domain event for WebSocket live updates
            appEventBus.emitTyped('order.created', {
              orderId: orderData.id,
              orderNumber,
              userId: orderData.userId || orderData.firebaseUid || '',
              customerName: orderData.customerName || orderData.customer_name || 'Customer',
              totalAmount,
              items: Array.isArray(orderData.items) ? orderData.items : [],
              paymentMethod: orderData.paymentMethod || 'COD',
              deliveryAddress: orderData.deliveryAddress?.addressLine || orderData.deliveryAddress || 'Pickup',
              contactPhone: orderData.contactPhone || '',
              orderTiming: orderData.orderTiming,
              timestamp: new Date().toISOString(),
              rawOrderData: orderData,
            });
          }

          // ── ORDER MODIFIED (STATUS TRANSITION) ────────────────────────────────
          else if (change.type === 'modified') {
            const currentStatus: string = orderData.status;
            const prevStatus = this.orderStatusCache.get(orderData.id);
            const slackTs: string | undefined = orderData.slackThreadTs;

            if (!currentStatus || currentStatus === prevStatus) continue;
            this.orderStatusCache.set(orderData.id, currentStatus);

            const shortId = orderData.id.slice(-6).toUpperCase();
            const orderNumber = orderData.dailyOrderNumber
              ? `#${orderData.dailyOrderNumber}`
              : (orderData.daily_order_number || `OP-${shortId}`);
            const totalAmount = Number(orderData.totalAmount || orderData.total_amount || 0);

            console.log(`🔄 Order ${orderNumber} Status Transition: ${prevStatus} → ${currentStatus}`);

            type StatusCfg = { emoji: string; label: string; category: 'orders' | 'delivery' };
            const statusConfig: Record<string, StatusCfg> = {
              accepted:         { emoji: '✅', label: 'Order Accepted',            category: 'orders' },
              preparing:        { emoji: '🍳', label: 'Preparing Your Order',      category: 'orders' },
              ready:            { emoji: '🟢', label: 'Order Ready',               category: 'orders' },
              packed:           { emoji: '📦', label: 'Order Packed & Ready',       category: 'orders' },
              partner_assigned: { emoji: '🛵', label: 'Delivery Partner Assigned',  category: 'delivery' },
              picked_up:        { emoji: '📦', label: 'Order Picked Up',            category: 'delivery' },
              out_for_delivery: { emoji: '🚀', label: 'Out for Delivery',           category: 'delivery' },
              delivered:        { emoji: '🎉', label: 'Order Delivered',            category: 'delivery' },
              cancelled:        { emoji: '❌', label: 'Order Cancelled',            category: 'orders' },
              payment_failed:   { emoji: '💳', label: 'Payment Failed',             category: 'orders' },
            };

            const cfg = statusConfig[currentStatus];
            if (!cfg) continue;

            // 1. SLACK NOTIFICATION
            if (currentStatus === 'partner_assigned' || currentStatus === 'out_for_delivery') {
              const deliveryBlocks = SlackProvider.generateDeliveryBlock(orderData, orderData.deliveryPartnerName || 'Partner');
              await notificationService.dispatch({ type: currentStatus, category: 'delivery', title: cfg.label, blocks: deliveryBlocks, thread_ts: slackTs });
            } else {
              await notificationService.dispatch({ type: currentStatus, category: cfg.category, title: cfg.label, details: `Order #${shortId} → ${cfg.emoji} *${cfg.label}*`, thread_ts: slackTs });
            }

            // FCM Push Notifications for Order Status Updates removed here per Spec §2.2 —
            // Handled directly & synchronously by NotificationEngine in POST /api/notifications/action.

            // 2. EMAIL FALLBACK / TRANSACTIONAL EMAILS
            this.sendOrderEmail(orderData, currentStatus);

            // 4. Emit AppEventBus domain event for WebSocket live updates
            appEventBus.emitTyped('order.status_changed', {
              orderId: orderData.id,
              orderNumber,
              userId: orderData.userId || orderData.firebaseUid || '',
              customerName: orderData.customerName || orderData.customer_name || 'Customer',
              previousStatus: prevStatus || '',
              currentStatus,
              totalAmount,
              deliveryPartnerId: orderData.deliveryPartnerId || orderData.delivery_partner_id,
              deliveryPartnerName: orderData.deliveryPartnerName,
              slackThreadTs: orderData.slackThreadTs,
              timestamp: new Date().toISOString(),
              rawOrderData: orderData,
            });
          }
        }
      },
      (error: any) => {
        console.error('❌ Order snapshot listener error:', error.message);
      }
    );
  }

  private static async sendOrderEmail(orderData: any, status: string) {
    try {
      const customerDoc = await db.collection('users').doc(orderData.userId || orderData.firebaseUid).get();
      const customerData = customerDoc.exists ? customerDoc.data() : null;
      const email = customerData?.email;
      if (!email) return;

      const shortId = orderData.id.slice(-6).toUpperCase();
      const orderNumber = orderData.dailyOrderNumber || orderData.daily_order_number || `OP-${shortId}`;
      const totalAmount = Number(orderData.totalAmount || orderData.total_amount || 0);

      let subject = '';
      if (status === 'pending') subject = `Order Placed — #${orderNumber}`;
      else if (status === 'accepted') subject = `Order Accepted — #${orderNumber}`;
      else if (status === 'cancelled') subject = `Order Cancelled — #${orderNumber}`;
      else if (status === 'delivered') subject = `Order Delivered — #${orderNumber}`;
      else return; // Don't email for every minor step like preparing

      const fullOrderData = {
        items: Array.isArray(orderData.items) ? orderData.items : [],
        subtotal: totalAmount, total_amount: totalAmount,
        deliveryAddress: orderData.deliveryAddress?.addressLine || orderData.deliveryAddress || 'Pickup',
        customerName: orderData.customerName || customerData?.name || 'Customer',
        contactPhone: orderData.contactPhone || customerData?.phone,
        paymentMethod: orderData.paymentMethod || 'COD',
      };

      const htmlBody = buildOrderStatusEmail({
        customerName: fullOrderData.customerName, subject, stage: status as any, orderId: orderData.id,
        data: { orderNumber, totalAmount: String(totalAmount), paymentMethod: fullOrderData.paymentMethod, deliveryAddress: fullOrderData.deliveryAddress },
        orderData: fullOrderData
      });

      // 1. Send Customer Email to customer's registered email account
      await queueEmail(email, subject, htmlBody, 'transactional');
      console.log(`[Email] Customer order email queued for ${email} (Stage: ${status})`);

      // 2. Also send Owner Alert Email to olivepizzarjn@gmail.com for New Orders & Cancellations
      if (status === 'pending' || status === 'cancelled') {
        const ownerEmail = process.env.OWNER_EMAIL || 'olivepizzarjn@gmail.com';
        const ownerSubject = status === 'pending'
          ? `🍕 NEW ORDER RECEIVED — #${orderNumber} (₹${totalAmount})`
          : `❌ ORDER CANCELLED — #${orderNumber}`;

        await queueEmail(ownerEmail, ownerSubject, htmlBody, 'transactional');
        console.log(`[Email] Owner alert email queued for ${ownerEmail} (Stage: ${status})`);
      }
    } catch (e) {
      console.warn('❌ Email dispatch failed:', e);
    }
  }

  private static listenToActivityLogs() {
    let initialLoad = true;
    db.collection('activity_logs').orderBy('timestamp', 'desc').limit(20).onSnapshot((snapshot: any) => {
      if (initialLoad) { initialLoad = false; return; }
      for (const change of snapshot.docChanges()) {
        if (change.type !== 'added') continue;
        const data = change.doc.data() as any;
        const action: string = data.action || '';
        let category: 'security' | 'inventory' | 'support' | 'general' = 'general';
        if (/security|login|permission|admin/i.test(action)) category = 'security';
        else if (/stock|inventory|product/i.test(action)) category = 'inventory';
        else if (/customer|support|ticket/i.test(action)) category = 'support';
        notificationService.dispatch({ type: 'activity_log', category, title: action, details: `*User:* ${data.user || 'System'}\n${data.details || ''}` });
      }
    });
  }
}
