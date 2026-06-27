/**
 * Firestore Listener — uses Firebase Admin SDK (bypasses security rules)
 * Now that we have a service account, this is the correct and most reliable approach.
 */
import { adminDb as db } from '../config/firebase.js';
import { notificationService } from '../services/notification/notification.service.js';
import { SlackProvider } from '../services/notification/slack.provider.js';

export class FirestoreListener {
  private static orderStatusCache = new Map<string, string>();

  static init() {
    try {
      this.listenToOrders();
      this.listenToActivityLogs();
      console.log('🎧 Firestore Listeners (Admin SDK) initialized for Slack.');
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

            this.orderStatusCache.set(orderData.id, orderData.status);

            if (orderData.orderTiming === 'scheduled') {
              console.log(`📅 Scheduled order: #${orderData.id.slice(-6).toUpperCase()} — sending Slack alert only`);
              const blocks = SlackProvider.generateOrderBlock(orderData);
              const ts = await notificationService.dispatchImmediate({
                type: 'scheduled_order_received',
                category: 'orders',
                title: `📅 New Scheduled Order — #${orderData.id.slice(-6).toUpperCase()}`,
                blocks
              });
              if (ts) {
                try { await change.doc.ref.update({ slackThreadTs: ts }); } catch (e) {}
              }
              return; // Skip the kitchen alarm
            }

            console.log(`🍕 New order: #${orderData.id.slice(-6).toUpperCase()} — sending Slack alert`);

            const blocks = SlackProvider.generateOrderBlock(orderData);

            const ts = await notificationService.dispatchImmediate({
              type: 'new_order',
              category: 'orders',
              title: `🍕 New Order — #${orderData.id.slice(-6).toUpperCase()}`,
              blocks,
            });

            // Save thread ts on the order for threaded follow-up replies
            if (ts) {
              try {
                await change.doc.ref.update({ slackThreadTs: ts });
              } catch (e) {
                console.warn('Could not save slackThreadTs:', e);
              }
            }
          }

          // ── ORDER MODIFIED ───────────────────────────────────────────────────
          else if (change.type === 'modified') {
            const currentStatus: string = orderData.status;
            const prevStatus = this.orderStatusCache.get(orderData.id);
            const slackTs: string | undefined = orderData.slackThreadTs;

            if (!currentStatus || currentStatus === prevStatus) continue;
            this.orderStatusCache.set(orderData.id, currentStatus);

            type StatusCfg = { emoji: string; label: string; category: 'orders' | 'delivery' };
            const statusConfig: Record<string, StatusCfg> = {
              accepted:         { emoji: '✅', label: 'Order Accepted',            category: 'orders' },
              preparing:        { emoji: '🍳', label: 'Preparing Your Order',      category: 'orders' },
              packed:           { emoji: '📦', label: 'Order Packed & Ready',       category: 'orders' },
              partner_assigned: { emoji: '🛵', label: 'Delivery Partner Assigned',  category: 'delivery' },
              out_for_delivery: { emoji: '🚀', label: 'Out for Delivery',           category: 'delivery' },
              delivered:        { emoji: '🎉', label: 'Order Delivered',            category: 'delivery' },
              cancelled:        { emoji: '❌', label: 'Order Cancelled',            category: 'orders' },
              payment_failed:   { emoji: '💳', label: 'Payment Failed',             category: 'orders' },
            };

            const cfg = statusConfig[currentStatus];
            if (!cfg) continue;

            console.log(`🔄 Order #${orderData.id.slice(-6).toUpperCase()}: ${prevStatus} → ${currentStatus}`);

            // Delivery partner assigned or picked up — send action buttons block
            if (currentStatus === 'partner_assigned' || currentStatus === 'out_for_delivery') {
              const deliveryBlocks = SlackProvider.generateDeliveryBlock(
                orderData,
                orderData.deliveryPartnerName || 'Partner'
              );
              await notificationService.dispatch({
                type: currentStatus,
                category: 'delivery',
                title: cfg.label,
                blocks: deliveryBlocks,
                thread_ts: slackTs,
              });
            } else {
              // Standard status update — reply in the order's original Slack thread
              await notificationService.dispatch({
                type: currentStatus,
                category: cfg.category,
                title: cfg.label,
                details: `Order #${orderData.id.slice(-6).toUpperCase()} → ${cfg.emoji} *${cfg.label}*`,
                thread_ts: slackTs,
              });
            }
          }
        }
      },
      (error: any) => {
        console.error('❌ Order snapshot listener error:', error.message);
      }
    );
  }

  private static listenToActivityLogs() {
    let initialLoad = true;

    db.collection('activity_logs')
      .orderBy('timestamp', 'desc')
      .limit(20)
      .onSnapshot(
        (snapshot: any) => {
          if (initialLoad) {
            initialLoad = false;
            return;
          }

          for (const change of snapshot.docChanges()) {
            if (change.type !== 'added') continue;

            const data = change.doc.data() as any;
            const action: string = data.action || '';

            let category: 'security' | 'inventory' | 'support' | 'general' = 'general';
            if (/security|login|permission|admin/i.test(action)) category = 'security';
            else if (/stock|inventory|product/i.test(action)) category = 'inventory';
            else if (/customer|support|ticket/i.test(action)) category = 'support';

            notificationService.dispatch({
              type: 'activity_log',
              category,
              title: action,
              details: `*User:* ${data.user || 'System'}\n${data.details || ''}`,
            });
          }
        },
        (error: any) => {
          console.error('❌ Activity log listener error:', error.message);
        }
      );
  }
}
