import { adminDb } from '../../config/firebase.js';
import { pgPool } from '../../config/postgres.js';
import { FieldValue } from 'firebase-admin/firestore';
import { notificationEngine } from '../notification/NotificationEngine.js';
import { CustomerTemplates } from '../notification/NotificationTemplates.js';

export type DeliveryPartnerStatus = 'online' | 'offline' | 'busy' | 'on_delivery' | 'break';

export interface DeliveryPartner {
  id: string;
  name: string;
  status: DeliveryPartnerStatus;
  latitude?: number;
  longitude?: number;
  assignedOrderId?: string;
  distanceFromRestaurantKm?: number;
  lastUpdated: Date;
}

export class DeliveryCapacityService {
  /**
   * Sets the status of a delivery partner and triggers queue processing if they become available.
   */
  static async setPartnerStatus(partnerId: string, status: DeliveryPartnerStatus, orderId?: string | null) {
    // 1. Update Firestore
    await adminDb.collection('users').doc(partnerId).update({
      deliveryStatus: status,
      ...(orderId !== undefined && { assignedOrderId: orderId }),
      lastStatusUpdate: FieldValue.serverTimestamp()
    });

    // 2. Update Postgres location table to reflect online status mapping
    try {
      const isOnline = (status === 'online' || status === 'on_delivery');
      const client = await pgPool.connect();
      await client.query(`
        UPDATE delivery_locations 
        SET online_status = $1, 
            active_order_id = COALESCE($2, active_order_id),
            last_updated = CURRENT_TIMESTAMP
        WHERE delivery_partner_id = $3
      `, [isOnline, orderId || null, partnerId]);
      client.release();
    } catch (e) {
      console.error('[DeliveryCapacity] Postgres update error:', e);
    }

    // 3. If becoming available (online and not assigned), pop the queue
    if (status === 'online') {
      await this.processNotifyQueue();
    }
  }

  /**
   * Evaluates the current restaurant delivery availability status
   */
  static async getRestaurantAvailability() {
    try {
      const settingsDoc = await adminDb.collection('settings').doc('store').get();
      const settings = settingsDoc.data() || {};
      
      const isRestaurantOpen = settings.isOpen !== false;
      const isDeliveryEnabled = settings.deliveryEnabled !== false;
      const isKitchenAccepting = settings.kitchenAccepting !== false;

      // Fetch all riders
      const snapshot = await adminDb.collection('users')
        .where('role', 'in', ['delivery', 'delivery_partner'])
        .get();

      let onlineCount = 0;
      let availableCount = 0;
      let onDeliveryCount = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const status = data.deliveryStatus || 'offline';
        if (status === 'online') {
          onlineCount++;
          availableCount++;
        }
        if (status === 'on_delivery') {
          onlineCount++;
          onDeliveryCount++;
        }
      });

      const canAcceptDeliveries = isRestaurantOpen && isDeliveryEnabled && isKitchenAccepting && (availableCount > 0);

      // Estimate Wait Time (mock logic for now - approx 15 mins base + 5 mins per active delivery)
      let estimatedWaitMins = 0;
      if (!canAcceptDeliveries && onDeliveryCount > 0) {
        estimatedWaitMins = 15 + (Math.round(onDeliveryCount / Math.max(1, onlineCount)) * 10);
      }

      return {
        isRestaurantOpen,
        isDeliveryEnabled,
        isKitchenAccepting,
        onlineCount,
        availableCount,
        onDeliveryCount,
        canAcceptDeliveries,
        estimatedWaitMins
      };

    } catch (e) {
      console.error('[DeliveryCapacity] Error evaluating availability', e);
      return { canAcceptDeliveries: false, estimatedWaitMins: 30 };
    }
  }

  /**
   * Enqueues a customer to be notified when delivery becomes available
   */
  static async addToNotifyQueue(customerId: string, fcmToken?: string) {
    const queueRef = adminDb.collection('delivery_notify_queue').doc(customerId);
    await queueRef.set({
      customerId,
      fcmToken: fcmToken || null,
      createdAt: FieldValue.serverTimestamp(),
      notified: false
    }, { merge: true });
    return true;
  }

  /**
   * Processes the notify queue and triggers push notifications
   */
  static async processNotifyQueue() {
    const queueSnap = await adminDb.collection('delivery_notify_queue')
      .where('notified', '==', false)
      .orderBy('createdAt', 'asc')
      .get();

    if (queueSnap.empty) return;

    // A rider is available. Let's notify everyone in the queue (scalable platforms batch this, we'll do it sequentially here for simplicity)
    const batch = adminDb.batch();
    
    for (const doc of queueSnap.docs) {
      const data = doc.data();
      const customerId = data.customerId;

      // Send push notification
      const payload = CustomerTemplates.informational('Delivery Available!', 'Great news! Delivery is available again. You can now place your order.', 'https://olivepizza.app/checkout');
      await notificationEngine.send(customerId, payload, { category: 'simple_informational', priority: 'high' });

      // Mark as notified so we don't spam them
      batch.update(doc.ref, { notified: true, notifiedAt: FieldValue.serverTimestamp() });
    }

    await batch.commit();
  }

  /**
   * Calculates the distance between two GPS coordinates in kilometers using the Haversine formula
   */
  static getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  }
}
