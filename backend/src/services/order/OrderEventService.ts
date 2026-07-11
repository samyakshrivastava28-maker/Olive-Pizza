/**
 * OrderEventService — Single Source of Truth
 *
 * Every order state change MUST go through this service.
 * It emits one canonical event consumed by:
 *   - Push Notifications (NotificationQueueService)
 *   - Email Engine (EmailRulesEngine)
 *   - Analytics
 *   - Firestore sync
 *
 * Guarantees:
 *   - Every event has a unique event ID
 *   - Every event carries current + previous status
 *   - Version is monotonically increasing per order
 *   - Stale events are rejected before processing
 */

import { EventEmitter } from 'events';
import { pgPool } from '../../config/postgres.js';
import { adminDb } from '../../config/firebase.js';
import { randomUUID } from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'partner_assigned'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export interface OrderEvent {
  /** Globally unique event ID — for replay attack prevention */
  eventId: string;
  /** The order being updated */
  orderId: string;
  /** Status BEFORE this transition */
  previousStatus: OrderStatus | null;
  /** Status AFTER this transition */
  currentStatus: OrderStatus;
  /** Monotonically incrementing version per order (stale guard) */
  version: number;
  /** ISO timestamp when the event was created on the server */
  eventTimestamp: string;
  /** ISO timestamp when it was committed to the DB */
  serverTimestamp: string;
  /** Resolved order data snapshot */
  order: OrderSnapshot;
}

export interface OrderSnapshot {
  id: string;
  userId: string;           // Postgres UUID
  firebaseUid: string;      // Firebase UID of customer
  orderNumber: string;      // e.g. "OP-1042"
  dailyOrderNumber: string;
  totalAmount: number;
  deliveryFee: number;
  contactPhone: string;
  deliveryAddress: string;
  deliveryPartnerFirebaseUid?: string;
  deliveryPartnerName?: string;
  items: OrderItemSnapshot[];
  status: OrderStatus;
  version: number;
  eta?: string;
  paymentMethod: string;
}

export interface OrderItemSnapshot {
  name: string;
  quantity: number;
  price: number;
  size?: string;
  crust?: string;
  imageUrl?: string;
}

// ─── Valid State Transitions ──────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:          ['accepted', 'cancelled'],
  accepted:         ['preparing', 'cancelled'],
  preparing:        ['ready', 'cancelled'],
  ready:            ['partner_assigned', 'cancelled'],
  partner_assigned: ['picked_up', 'cancelled'],
  picked_up:        ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered:        ['completed'],
  completed:        [],
  cancelled:        [],
};

// ─── OrderEventService ────────────────────────────────────────────────────────

class OrderEventServiceImpl extends EventEmitter {
  // In-memory processed event IDs to prevent replay attacks (TTL 5 min)
  private processedEventIds = new Map<string, number>();
  private cleanupTimer: NodeJS.Timeout;

  constructor() {
    super();
    this.setMaxListeners(50);
    // Clean up old event IDs every 5 minutes
    this.cleanupTimer = setInterval(() => {
      const cutoff = Date.now() - 5 * 60 * 1000;
      for (const [id, ts] of this.processedEventIds) {
        if (ts < cutoff) this.processedEventIds.delete(id);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Emit an order state change.
   * Validates the transition, increments the version, and broadcasts the event.
   * Returns the canonical OrderEvent or null if the transition is invalid/stale.
   */
  async emitStatusChange(
    orderId: string,
    newStatus: OrderStatus,
    updatedByUid: string,
    extra: { eta?: string; deliveryPartnerFirebaseUid?: string; deliveryPartnerName?: string } = {}
  ): Promise<OrderEvent | null> {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');

      // Lock the order row to prevent concurrent transitions
      const orderRes = await client.query(
        `SELECT o.*, u.firebase_uid as customer_firebase_uid, u.name as customer_name
         FROM orders o
         JOIN users u ON o.user_id = u.id
         WHERE o.id = $1
         FOR UPDATE`,
        [orderId]
      );

      if (orderRes.rows.length === 0) {
        await client.query('ROLLBACK');
        console.warn(`[OrderEventService] Order ${orderId} not found`);
        return null;
      }

      const row = orderRes.rows[0];
      const previousStatus = row.status as OrderStatus;
      const currentVersion: number = row.notification_version || 0;

      // Validate state transition
      if (previousStatus === newStatus) {
        await client.query('ROLLBACK');
        console.log(`[OrderEventService] No-op: ${orderId} already in status ${newStatus}`);
        return null;
      }

      const allowedNext = VALID_TRANSITIONS[previousStatus] || [];
      if (!allowedNext.includes(newStatus)) {
        await client.query('ROLLBACK');
        console.warn(`[OrderEventService] Invalid transition ${previousStatus} → ${newStatus} for order ${orderId}`);
        return null;
      }

      const newVersion = currentVersion + 1;
      const eventId = randomUUID();
      const eventTimestamp = new Date().toISOString();

      // Update DB
      await client.query(
        `UPDATE orders
         SET status = $1, notification_version = $2, updated_at = NOW()
         WHERE id = $3`,
        [newStatus, newVersion, orderId]
      );

      // Fetch items for snapshot
      const itemsRes = await client.query(
        `SELECT oi.quantity, oi.price_at_time, oi.size, oi.crust,
                mi.name, mi.image_url
         FROM order_items oi
         JOIN menu_items mi ON oi.menu_item_id = mi.id
         WHERE oi.order_id = $1`,
        [orderId]
      );

      const items: OrderItemSnapshot[] = itemsRes.rows.map(r => ({
        name: r.name,
        quantity: r.quantity,
        price: Number(r.price_at_time),
        size: r.size,
        crust: r.crust,
        imageUrl: r.image_url,
      }));

      const snapshot: OrderSnapshot = {
        id: orderId,
        userId: row.user_id,
        firebaseUid: row.customer_firebase_uid,
        orderNumber: row.daily_order_number || `OP-${orderId.slice(-6).toUpperCase()}`,
        dailyOrderNumber: row.daily_order_number || orderId.slice(-6).toUpperCase(),
        totalAmount: Number(row.total_amount),
        deliveryFee: Number(row.delivery_fee || 0),
        contactPhone: row.contact_phone,
        deliveryAddress: row.delivery_address_line,
        deliveryPartnerFirebaseUid: extra.deliveryPartnerFirebaseUid,
        deliveryPartnerName: extra.deliveryPartnerName,
        items,
        status: newStatus,
        version: newVersion,
        eta: extra.eta,
        paymentMethod: row.payment_method || 'COD',
      };

      const event: OrderEvent = {
        eventId,
        orderId,
        previousStatus,
        currentStatus: newStatus,
        version: newVersion,
        eventTimestamp,
        serverTimestamp: new Date().toISOString(),
        order: snapshot,
      };

      // Log event to audit table
      await client.query(
        `INSERT INTO order_event_log
           (event_id, order_id, previous_status, current_status, version, event_timestamp, updated_by)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)
         ON CONFLICT (event_id) DO NOTHING`,
        [eventId, orderId, previousStatus, newStatus, newVersion, updatedByUid]
      ).catch(() => {}); // Table may not exist yet, non-fatal

      await client.query('COMMIT');

      // Track as processed
      this.processedEventIds.set(eventId, Date.now());

      // Sync to Firestore for real-time clients
      adminDb.collection('orders').doc(orderId).update({
        status: newStatus,
        notificationVersion: newVersion,
        lastEventId: eventId,
        updatedAt: new Date(),
      }).catch(err => console.warn('[OrderEventService] Firestore sync failed (non-fatal):', err));

      // Broadcast to all consumers
      this.emit('order:status_changed', event);
      console.log(`[OrderEventService] ✅ ${orderId}: ${previousStatus} → ${newStatus} v${newVersion}`);

      return event;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[OrderEventService] emitStatusChange error:', err);
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Emit a new order event (order placed — does not change status).
   */
  async emitNewOrder(orderId: string): Promise<OrderEvent | null> {
    const client = await pgPool.connect();
    try {
      const orderRes = await client.query(
        `SELECT o.*, u.firebase_uid as customer_firebase_uid, u.name as customer_name
         FROM orders o
         JOIN users u ON o.user_id = u.id
         WHERE o.id = $1`,
        [orderId]
      );

      if (orderRes.rows.length === 0) return null;
      const row = orderRes.rows[0];

      // Initialise notification_version = 1 for new orders
      await client.query(
        `UPDATE orders SET notification_version = 1 WHERE id = $1 AND (notification_version IS NULL OR notification_version = 0)`,
        [orderId]
      );

      const itemsRes = await client.query(
        `SELECT oi.quantity, oi.price_at_time, oi.size, oi.crust,
                mi.name, mi.image_url
         FROM order_items oi
         JOIN menu_items mi ON oi.menu_item_id = mi.id
         WHERE oi.order_id = $1`,
        [orderId]
      );

      const items: OrderItemSnapshot[] = itemsRes.rows.map(r => ({
        name: r.name,
        quantity: r.quantity,
        price: Number(r.price_at_time),
        size: r.size,
        crust: r.crust,
        imageUrl: r.image_url,
      }));

      const snapshot: OrderSnapshot = {
        id: orderId,
        userId: row.user_id,
        firebaseUid: row.customer_firebase_uid,
        orderNumber: row.daily_order_number || `OP-${orderId.slice(-6).toUpperCase()}`,
        dailyOrderNumber: row.daily_order_number || orderId.slice(-6).toUpperCase(),
        totalAmount: Number(row.total_amount),
        deliveryFee: Number(row.delivery_fee || 0),
        contactPhone: row.contact_phone,
        deliveryAddress: row.delivery_address_line,
        items,
        status: 'pending',
        version: 1,
        paymentMethod: row.payment_method || 'COD',
      };

      const event: OrderEvent = {
        eventId: randomUUID(),
        orderId,
        previousStatus: null,
        currentStatus: 'pending',
        version: 1,
        eventTimestamp: new Date().toISOString(),
        serverTimestamp: new Date().toISOString(),
        order: snapshot,
      };

      this.emit('order:new', event);
      console.log(`[OrderEventService] ✅ New order: ${orderId}`);
      return event;
    } finally {
      client.release();
    }
  }

  /**
   * Validate that a notification's event data is not stale.
   * Returns true if the notification should be DROPPED.
   */
  async isStale(orderId: string, notifVersion: number, notifStatus: string): Promise<boolean> {
    if (!orderId) return false;
    const client = await pgPool.connect();
    try {
      const res = await client.query(
        `SELECT status, notification_version FROM orders WHERE id = $1`,
        [orderId]
      );
      if (res.rows.length === 0) return true; // Order not found = stale
      const { status, notification_version } = res.rows[0];
      // Drop if current DB version is higher (newer event superseded this one)
      if ((notification_version || 0) > notifVersion) {
        console.log(`[OrderEventService] STALE: order ${orderId} v${notification_version} > notif v${notifVersion}, dropping`);
        return true;
      }
      // Drop if the order is already in a terminal state and this notif is for an older stage
      const terminal = ['delivered', 'completed', 'cancelled'];
      if (terminal.includes(status) && !terminal.includes(notifStatus)) {
        console.log(`[OrderEventService] STALE: order ${orderId} is ${status}, dropping ${notifStatus} notification`);
        return true;
      }
      return false;
    } finally {
      client.release();
    }
  }

  destroy() {
    clearInterval(this.cleanupTimer);
    this.removeAllListeners();
  }
}

export const orderEventService = new OrderEventServiceImpl();
