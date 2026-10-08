/**
 * LiveOrderNotificationService.ts
 *
 * Enterprise Service for Android Persistent Live Order Notifications and Web Notifications.
 * - Bridges to native Android LiveOrderNotificationPlugin (`olive_order_${orderId}`).
 * - Updates ongoing notifications in place when status changes:
 *     PLACED -> ACCEPTED -> PREPARING -> OUT_FOR_DELIVERY -> DELIVERED
 * - Displays status titles (e.g. "Pizza is in the oven! 🍕", "Rider is on the way! 🛵").
 * - Shows estimated delivery time / ETA.
 * - Deep links to `/order-tracking/:id`.
 * - When DELIVERED or CANCELLED: cancels ongoing notification and posts final completion notification.
 * - Fallback to HTML5 Notifications on Web/PWA with matching tag.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

export interface LiveNotificationPayload {
  orderId: string;
  orderNumber?: string;
  status: string;
  step?: number;
  itemsSummary?: string;
  totalAmount?: number;
  etaMinutes?: number | null;
  etaText?: string;
  riderName?: string;
  riderPhone?: string;
  restaurantName?: string;
  url?: string;
}

export interface LiveOrderNotificationPlugin {
  updateNotification(options: {
    orderId: string;
    orderNumber?: string;
    status: string;
    title: string;
    body: string;
    step?: number;
    url?: string;
    riderPhone?: string;
  }): Promise<{ success: boolean; terminal?: boolean; tag?: string; notificationId?: number }>;

  clearNotification(options: {
    orderId: string;
  }): Promise<{ success: boolean }>;
}

export const LiveOrderNotification = registerPlugin<LiveOrderNotificationPlugin>('LiveOrderNotification');

export interface StatusContent {
  title: string;
  body: string;
  step: number;
  isTerminal: boolean;
}

export function formatStatusContent(
  status: string,
  options: {
    etaMinutes?: number | null;
    etaText?: string;
    riderName?: string;
    itemsSummary?: string;
  } = {}
): StatusContent {
  const normStatus = (status || 'pending').toLowerCase();
  const etaDisplay = options.etaText || (options.etaMinutes ? `${options.etaMinutes} mins` : null);

  switch (normStatus) {
    case 'pending':
    case 'placed':
      return {
        title: 'Order Placed! 🍕',
        body: etaDisplay
          ? `ETA: ~${etaDisplay} • Waiting for kitchen confirmation.`
          : "We've received your order! Kitchen will confirm shortly.",
        step: 1,
        isTerminal: false,
      };

    case 'accepted':
    case 'confirmed':
      return {
        title: 'Order Confirmed! 👨‍🍳',
        body: etaDisplay
          ? `ETA: ~${etaDisplay} • Kitchen has accepted your order.`
          : 'The kitchen is preparing to cook your feast.',
        step: 2,
        isTerminal: false,
      };

    case 'preparing':
    case 'in_preparation':
    case 'cooking':
      return {
        title: 'Pizza is in the oven! 🍕',
        body: etaDisplay
          ? `ETA: ~${etaDisplay} • Baking hot & fresh with cheese & toppings.`
          : 'Baking fresh in the oven with gooey cheese & fresh crust.',
        step: 3,
        isTerminal: false,
      };

    case 'ready':
    case 'packed':
      return {
        title: 'Order Packed & Ready! 📦',
        body: etaDisplay
          ? `ETA: ~${etaDisplay} • Packed piping hot for courier.`
          : 'Freshly packed and waiting for delivery partner pickup.',
        step: 4,
        isTerminal: false,
      };

    case 'partner_assigned':
      return {
        title: 'Rider Assigned! 🛵',
        body: options.riderName
          ? `${options.riderName} is assigned • ${etaDisplay ? `ETA: ${etaDisplay}` : 'Heading to restaurant'}`
          : `Delivery partner assigned • ${etaDisplay ? `ETA: ${etaDisplay}` : 'Arriving at restaurant'}`,
        step: 5,
        isTerminal: false,
      };

    case 'picked_up':
      return {
        title: 'Rider Picked Up Your Order! 🛵',
        body: options.riderName
          ? `${options.riderName} picked up your meal • ${etaDisplay ? `ETA: ${etaDisplay}` : 'Heading your way'}`
          : `Order picked up • ${etaDisplay ? `ETA: ${etaDisplay}` : 'Heading your way'}`,
        step: 5,
        isTerminal: false,
      };

    case 'out_for_delivery':
      return {
        title: 'Rider is on the way! 🛵',
        body: options.riderName
          ? `${options.riderName} is en route • ${etaDisplay ? `Arriving in ~${etaDisplay}` : 'Arriving shortly'}`
          : `Your food is on the way • ${etaDisplay ? `Arriving in ~${etaDisplay}` : 'Arriving shortly'}`,
        step: 6,
        isTerminal: false,
      };

    case 'delivered':
    case 'completed':
      return {
        title: 'Order Delivered! 🎉 Enjoy your meal!',
        body: 'Your delicious Olive Pizza order has arrived. Enjoy every bite!',
        step: 7,
        isTerminal: true,
      };

    case 'cancelled':
      return {
        title: 'Order Cancelled ❌',
        body: 'Your order was cancelled. Tap to view details or contact help.',
        step: 0,
        isTerminal: true,
      };

    default:
      return {
        title: 'Live Order Update 🍕',
        body: etaDisplay ? `ETA: ~${etaDisplay} • Tracking order` : 'Your order is currently processing.',
        step: 1,
        isTerminal: false,
      };
  }
}

class LiveOrderNotificationServiceClass {
  private lastStatusMap = new Map<string, string>();

  /**
   * Updates or posts the ongoing live order notification.
   */
  public async updateLiveOrderNotification(payload: LiveNotificationPayload): Promise<boolean> {
    if (!payload?.orderId) return false;

    const { title, body, step, isTerminal } = formatStatusContent(payload.status, {
      etaMinutes: payload.etaMinutes,
      etaText: payload.etaText,
      riderName: payload.riderName,
      itemsSummary: payload.itemsSummary,
    });

    const deepLinkUrl = payload.url || `/order-tracking/${payload.orderId}`;
    const prevStatus = this.lastStatusMap.get(payload.orderId);

    // Skip redundant updates if status hasn't changed and ETA hasn't changed
    if (prevStatus === payload.status && isTerminal) {
      return true;
    }
    this.lastStatusMap.set(payload.orderId, payload.status);

    // 1. Android Native Execution
    if (Capacitor.getPlatform() === 'android') {
      try {
        const res = await LiveOrderNotification.updateNotification({
          orderId: payload.orderId,
          orderNumber: payload.orderNumber || payload.orderId.slice(-6),
          status: payload.status,
          title,
          body,
          step,
          url: deepLinkUrl,
          riderPhone: payload.riderPhone || '',
        });
        console.log(`[LiveOrderNotificationService] Updated Android notification for ${payload.orderId}:`, res);
        return !!res?.success;
      } catch (err: any) {
        console.warn('[LiveOrderNotificationService] Android updateNotification error:', err.message || err);
        return false;
      }
    }

    // 2. Web / PWA Fallback Execution
    if (Capacitor.getPlatform() === 'web') {
      try {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          const tag = `olive_order_${payload.orderId}`;
          const notif = new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag,
            requireInteraction: !isTerminal,
            data: { url: deepLinkUrl, orderId: payload.orderId },
          });

          notif.onclick = () => {
            window.focus();
            if (window.location.pathname !== deepLinkUrl) {
              window.location.href = deepLinkUrl;
            }
          };

          return true;
        }
      } catch (e) {
        console.warn('[LiveOrderNotificationService] Web notification fallback error:', e);
      }
    }

    return true;
  }

  /**
   * Clears the notification (e.g. after user dismisses order or logs out).
   */
  public async clearLiveOrderNotification(orderId: string): Promise<boolean> {
    if (!orderId) return false;
    this.lastStatusMap.delete(orderId);

    if (Capacitor.getPlatform() === 'android') {
      try {
        const res = await LiveOrderNotification.clearNotification({ orderId });
        return !!res?.success;
      } catch (err) {
        console.warn('[LiveOrderNotificationService] clearNotification error:', err);
        return false;
      }
    }

    return true;
  }
}

export const LiveOrderNotificationService = new LiveOrderNotificationServiceClass();
