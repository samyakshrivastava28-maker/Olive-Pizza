/**
 * Firestore Listener — uses Firebase Admin SDK (bypasses security rules)
 * This is the SINGLE SOURCE OF TRUTH for all order notifications.
 */
import { adminDb as db } from '../config/firebase.js';
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

  static init() {
    try {
      this.listenToOrders();
      this.listenToActivityLogs();
      console.log('🎧 Firestore Listeners (Admin SDK) initialized for Unified Notifications.');
    } catch (err) {
      console.error('❌ Failed to initialize Firestore Listeners:', err);
    }
  }

  private static listenToOrders() {
    db.collection('orders').onSnapshot(
      async (snapshot: any) => {
        for (const change of snapshot.docChanges()) {
          const orderData = { id: change.doc.id, ...change.doc.data() } as any;

          // ── NEW ORDER ────────────────────────────────────────────────────────
          if (change.type === 'added') {
            const createdAt: Date =
              orderData.createdAt?.toDate?.() ??
              new Date((orderData.createdAt?._seconds || 0) * 1000);

            // Skip orders older than 10 min (server restart replay protection)
            if (Date.now() - createdAt.getTime() > 10 * 60 * 1000) continue;
            
            // Prevent duplicate triggers if we already processed this order creation
            if (this.processedOrderIds.has(orderData.id)) continue;
            this.processedOrderIds.add(orderData.id);

            this.orderStatusCache.set(orderData.id, orderData.status);

            const shortId = orderData.id.slice(-6).toUpperCase();
            const orderNumber = orderData.dailyOrderNumber || orderData.daily_order_number || `OP-${shortId}`;
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

            if (orderData.orderTiming === 'scheduled') return; // Skip push alarms for scheduled until ready

            // 2. FCM PUSH NOTIFICATION TO OWNERS (INSTANT DIRECT PUSH + QUEUE BACKUP)
            try {
              const ownerDocs = await db.collection('users').where('role', '==', 'owner').get();
              const ownerUids = ownerDocs.docs.map(d => d.id);
              if (ownerUids.length > 0) {
                const ownerPayload = OwnerTemplates.newOrder(orderData.id, {
                  customerName: orderData.customerName || orderData.customer_name || 'Customer',
                  orderNumber,
                  totalAmount,
                  items: Array.isArray(orderData.items) ? orderData.items.map((i: any) => `${i.name} x${i.quantity}`) : [],
                  paymentMethod: orderData.paymentMethod || 'COD',
                  deliveryAddress: orderData.deliveryAddress?.addressLine || orderData.deliveryAddress || 'Pickup',
                  phone: orderData.contactPhone || 'No Phone',
                  orderTime: createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                  version: 1,
                  eventId: `new_${orderData.id}`,
                  previousStatus: undefined,
                  eventTimestamp: createdAt.toISOString(),
                });

                // Fast Direct Push (same pipeline as owner manual broadcast)
                await directNotification.sendBulkPush(ownerUids, ownerPayload, 'high', {
                  tag: `order_owner_${orderData.id}`,
                  orderId: orderData.id,
                  category: 'order',
                  priority: 'critical',
                  version: 1
                }).catch(e => console.warn('Direct owner push warning:', e.message));

                for (const uid of ownerUids) {
                  await notificationQueue.enqueue(uid, ownerPayload, 'high', {
                    tag: `order_owner_${orderData.id}`,
                    orderId: orderData.id,
                    category: 'order',
                    priority: 'critical',
                    version: 1
                  }).catch(() => {});
                }
              }
            } catch (err: any) {
              console.error('❌ Owner Push Error:', err.message);
            }

            // 3. EMAIL TO CUSTOMER
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
            const orderNumber = orderData.dailyOrderNumber || orderData.daily_order_number || `OP-${shortId}`;
            const totalAmount = Number(orderData.totalAmount || orderData.total_amount || 0);

            console.log(`🔄 Order ${orderNumber} Status Transition: ${prevStatus} → ${currentStatus}`);

            type StatusCfg = { emoji: string; label: string; category: 'orders' | 'delivery' };
            const statusConfig: Record<string, StatusCfg> = {
              accepted:         { emoji: '✅', label: 'Order Accepted',            category: 'orders' },
              preparing:        { emoji: '🍳', label: 'Preparing Your Order',      category: 'orders' },
              ready:            { emoji: '🟢', label: 'Order Ready',               category: 'orders' },
              packed:           { emoji: '📦', label: 'Order Packed & Ready',       category: 'orders' },
              partner_assigned: { emoji: '🛵', label: 'Delivery Partner Assigned',  category: 'delivery' },
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

            // 2. FCM PUSH NOTIFICATIONS
            const customerId = orderData.userId || orderData.firebaseUid;
            const partnerId = orderData.deliveryPartnerId || orderData.delivery_partner_id;
            
            // Map status to payload version sequentially for deduplication
            const versionMap: Record<string, number> = {
              'accepted': 2, 'preparing': 3, 'ready': 4, 'packed': 5, 
              'partner_assigned': 6, 'picked_up': 7, 'out_for_delivery': 8, 'delivered': 9, 'cancelled': 10
            };
            const version = versionMap[currentStatus] || 2;

            if (currentStatus === 'partner_assigned' && partnerId) {
              // Notify Partner (Fast Direct Push)
              const deliveryPayload = DeliveryTemplates.newAssignment(orderData.id, {
                orderNumber: shortId, customerName: orderData.customerName || 'Customer', customerPhone: orderData.contactPhone,
                deliveryAddress: orderData.deliveryAddress?.addressLine || orderData.deliveryAddress || 'Address not provided',
                distance: '?', eta: '15 mins', totalAmount, paymentMethod: orderData.paymentMethod || 'COD', version
              });
              await directNotification.sendPush(partnerId, deliveryPayload, 'high', { tag: `order_delivery_${orderData.id}`, orderId: orderData.id, category: 'delivery', priority: 'critical', version }).catch(e => console.warn('Direct partner push warning:', e.message));
              await notificationQueue.enqueue(partnerId, deliveryPayload, 'high', { tag: `order_delivery_${orderData.id}`, orderId: orderData.id, category: 'delivery', priority: 'critical', version }).catch(() => {});
            }

            // Notify Customer (Fast Direct Push)
            if (customerId && ['accepted', 'preparing', 'ready', 'partner_assigned', 'out_for_delivery', 'delivered', 'cancelled'].includes(currentStatus)) {
              const cPayload = CustomerTemplates.orderUpdate(orderData.id, {
                orderNumber: shortId, status: currentStatus as any, totalAmount, 
                deliveryPartnerName: orderData.deliveryPartnerName || 'Partner', version
              });
              await directNotification.sendPush(customerId, cPayload, 'high', { tag: `order_customer_${orderData.id}`, orderId: orderData.id, category: 'order', version }).catch(e => console.warn('Direct customer push warning:', e.message));
              await notificationQueue.enqueue(customerId, cPayload, 'high', { tag: `order_customer_${orderData.id}`, orderId: orderData.id, category: 'order', version }).catch(() => {});
            }

            // Notify Owners (Fast Direct Push)
            if (['picked_up', 'out_for_delivery', 'delivered'].includes(currentStatus)) {
               const ownerDocs = await db.collection('users').where('role', '==', 'owner').get();
               const ownerUids = ownerDocs.docs.map(d => d.id);
               if (ownerUids.length > 0) {
                 const oPayload = OwnerTemplates.orderStatusUpdate(orderData.id, { orderNumber: shortId, customerName: orderData.customerName || 'Customer', status: currentStatus as any, deliveryPartnerName: orderData.deliveryPartnerName || 'Partner', totalAmount, version });
                 await directNotification.sendBulkPush(ownerUids, oPayload, 'normal', { tag: `order_owner_tracking_${orderData.id}`, orderId: orderData.id, category: 'order', version }).catch(e => console.warn('Direct owner tracking push warning:', e.message));
                 for (const ownerUid of ownerUids) {
                   await notificationQueue.enqueue(ownerUid, oPayload, 'normal', { tag: `order_owner_tracking_${orderData.id}`, orderId: orderData.id, category: 'order', version }).catch(() => {});
                 }
               }
            }

            // 3. EMAIL FALLBACK / TRANSACTIONAL EMAILS
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
