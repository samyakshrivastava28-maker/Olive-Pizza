import { EventEmitter } from 'events';
import { pgPool } from '../../config/postgres.js';
import { adminDb } from '../../config/firebase.js';
import { randomUUID } from 'crypto';

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
  eventId: string;
  orderId: string;
  previousStatus: OrderStatus | null;
  currentStatus: OrderStatus;
  version: number;
  eventTimestamp: string;
  serverTimestamp: string;
  order: OrderSnapshot;
}

export interface OrderSnapshot {
  id: string;
  userId: string;
  firebaseUid: string;
  orderNumber: string;
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

class OrderEventServiceImpl extends EventEmitter {
  private processedEventIds = new Map<string, number>();
  private cleanupTimer: NodeJS.Timeout;

  constructor() {
    super();
    this.setMaxListeners(50);
    this.cleanupTimer = setInterval(() => {
      const cutoff = Date.now() - 5 * 60 * 1000;
      for (const [id, ts] of this.processedEventIds) {
        if (ts < cutoff) this.processedEventIds.delete(id);
      }
    }, 60000);
  }

  public async isStale(orderId: string, version: number, stage: string): Promise<boolean> {
    try {
      const orderDoc = await adminDb.collection('orders').doc(orderId).get();
      if (!orderDoc.exists) return true;
      const data = orderDoc.data();
      const currentVersion = data?.notification_version || 0;
      return currentVersion > version;
    } catch {
      return false;
    }
  }

  async emitStatusChange(
    orderId: string,
    newStatus: OrderStatus,
    updatedByUid: string,
    extra: { eta?: string; deliveryPartnerFirebaseUid?: string; deliveryPartnerName?: string } = {}
  ): Promise<OrderEvent | null> {
    const client = await pgPool.connect();
    let lockAcquired = false;

    try {
      await client.query('BEGIN');
      
      // Distributed idempotency lock via Postgres
      await client.query(
        `INSERT INTO order_locks (order_id) VALUES ($1) ON CONFLICT (order_id) DO UPDATE SET locked_at = NOW()`,
        [orderId]
      );
      lockAcquired = true;

      // Single source of truth is now Firestore
      const orderRef = adminDb.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        await client.query('ROLLBACK');
        console.warn(`[OrderEventService] Order ${orderId} not found`);
        return null;
      }

      const row = orderDoc.data()!;
      const previousStatus = row.status as OrderStatus;
      const currentVersion: number = row.notification_version || 0;

      if (previousStatus === newStatus) {
        await client.query('ROLLBACK');
        return null;
      }

      const allowedNext = VALID_TRANSITIONS[previousStatus] || [];
      if (!allowedNext.includes(newStatus)) {
        await client.query('ROLLBACK');
        console.warn(`[OrderEventService] Invalid transition ${previousStatus} → ${newStatus}`);
        return null;
      }

      const newVersion = currentVersion + 1;
      const eventId = randomUUID();
      const eventTimestamp = new Date().toISOString();

      // Update Firestore
      const updates: any = {
        status: newStatus,
        notification_version: newVersion,
        updatedAt: new Date()
      };
      
      if (extra.deliveryPartnerFirebaseUid) updates.deliveryPartnerFirebaseUid = extra.deliveryPartnerFirebaseUid;
      if (extra.deliveryPartnerName) updates.deliveryPartnerName = extra.deliveryPartnerName;

      await orderRef.update(updates);

      // Create snapshot
      const snapshot: OrderSnapshot = {
        id: orderId,
        userId: row.userId,
        firebaseUid: row.userId,
        orderNumber: row.daily_order_number,
        dailyOrderNumber: row.daily_order_number,
        totalAmount: row.totalAmount,
        deliveryFee: row.deliveryFee || 0,
        contactPhone: row.contactPhone,
        deliveryAddress: row.deliveryAddress?.addressLine || row.deliveryAddress,
        deliveryPartnerFirebaseUid: extra.deliveryPartnerFirebaseUid || row.deliveryPartnerFirebaseUid,
        deliveryPartnerName: extra.deliveryPartnerName || row.deliveryPartnerName,
        items: row.items,
        status: newStatus,
        version: newVersion,
        eta: extra.eta || row.eta,
        paymentMethod: row.paymentMethod || 'COD'
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

      this.processedEventIds.set(eventId, Date.now());
      this.emit('order_status_changed', event);

      await client.query('COMMIT');
      return event;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[OrderEventService] Error processing transition:', error);
      throw error;
    } finally {
      if (lockAcquired) {
        // Wait a tiny bit before releasing the lock to prevent immediate race conditions 
        // across extremely fast subsequent taps
        setTimeout(() => {
           client.query('DELETE FROM order_locks WHERE order_id = $1', [orderId]).catch(console.error);
        }, 1000);
      }
      client.release();
    }
  }

  async emitNewOrder(orderId: string): Promise<OrderEvent | null> {
    const client = await pgPool.connect();
    let lockAcquired = false;

    try {
      await client.query('BEGIN');
      
      await client.query(
        `INSERT INTO order_locks (order_id) VALUES ($1) ON CONFLICT (order_id) DO UPDATE SET locked_at = NOW()`,
        [orderId]
      );
      lockAcquired = true;

      const orderRef = adminDb.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        await client.query('ROLLBACK');
        return null;
      }

      const row = orderDoc.data()!;
      const eventId = randomUUID();
      const eventTimestamp = new Date().toISOString();

      const snapshot: OrderSnapshot = {
        id: orderId,
        userId: row.userId,
        firebaseUid: row.userId,
        orderNumber: row.daily_order_number,
        dailyOrderNumber: row.daily_order_number,
        totalAmount: row.totalAmount,
        deliveryFee: row.deliveryFee || 0,
        contactPhone: row.contactPhone,
        deliveryAddress: row.deliveryAddress?.addressLine || row.deliveryAddress,
        items: row.items,
        status: 'pending',
        version: 1,
        paymentMethod: row.paymentMethod || 'COD'
      };

      const event: OrderEvent = {
        eventId,
        orderId,
        previousStatus: null,
        currentStatus: 'pending',
        version: 1,
        eventTimestamp,
        serverTimestamp: new Date().toISOString(),
        order: snapshot,
      };

      this.processedEventIds.set(eventId, Date.now());
      this.emit('order_placed', event);

      await client.query('COMMIT');
      return event;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      if (lockAcquired) {
        setTimeout(() => {
           client.query('DELETE FROM order_locks WHERE order_id = $1', [orderId]).catch(console.error);
        }, 1000);
      }
      client.release();
    }
  }
}

export const orderEventService = new OrderEventServiceImpl();
