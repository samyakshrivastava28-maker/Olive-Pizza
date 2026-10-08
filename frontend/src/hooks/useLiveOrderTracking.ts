import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { LiveActivityManager } from '../services/LiveActivityManager';
import { LiveOrderNotificationService, formatStatusContent } from '../services/LiveOrderNotificationService';

export interface LiveOrderTrackingProps {
  orderId?: string;
  orderNumber?: string;
  status?: string;
  step?: number;
  itemsSummary?: string;
  totalAmount?: number;
  etaMinutes?: number | null;
  etaText?: string;
  riderName?: string;
  riderPhone?: string;
  restaurantName?: string;
}

export function useLiveOrderTracking(order?: LiveOrderTrackingProps | null) {
  const [isSupported, setIsSupported] = useState(false);
  const [activityId, setActivityId] = useState<string | null>(null);

  // 1. Check platform capabilities on mount
  useEffect(() => {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') {
      LiveActivityManager.areActivitiesEnabled()
        .then(enabled => setIsSupported(enabled))
        .catch(() => setIsSupported(false));
    } else {
      // Android and Web support persistent notifications
      setIsSupported(true);
    }
  }, []);

  // 2. Setup iOS push token listener
  useEffect(() => {
    if (Capacitor.getPlatform() === 'ios') {
      LiveActivityManager.setupPushTokenListener();
    }
  }, []);

  // 3. Start, update in place, or end notification when order state changes
  useEffect(() => {
    if (!order?.orderId) return;

    const platform = Capacitor.getPlatform();
    const orderId = order.orderId;
    const status = (order.status || 'pending').toLowerCase();
    const isTerminal = status === 'delivered' || status === 'cancelled' || status === 'completed';

    const { step } = formatStatusContent(status, {
      etaMinutes: order.etaMinutes,
      etaText: order.etaText,
      riderName: order.riderName,
      itemsSummary: order.itemsSummary,
    });

    const payload = {
      orderId,
      orderNumber: order.orderNumber || orderId.slice(-6),
      status,
      step: order.step ?? step,
      itemsSummary: order.itemsSummary || 'Olive Pizza Feast',
      totalAmount: order.totalAmount || 0,
      etaMinutes: order.etaMinutes ?? 25,
      etaText: order.etaText,
      riderName: order.riderName || '',
      riderPhone: order.riderPhone || '',
      restaurantName: order.restaurantName || 'Olive Pizza',
      url: `/order-tracking/${orderId}`,
    };

    if (platform === 'ios') {
      if (isTerminal) {
        LiveActivityManager.endActivity(orderId, status, 300)
          .catch(err => console.warn('[useLiveOrderTracking] iOS endActivity error:', err));
        setActivityId(null);
      } else {
        LiveActivityManager.startOrUpdateActivity(payload)
          .then(actId => {
            if (actId) setActivityId(actId);
          })
          .catch(err => console.warn('[useLiveOrderTracking] iOS startActivity error:', err));
      }
    } else {
      // Android Native & Web
      LiveOrderNotificationService.updateLiveOrderNotification(payload)
        .catch(err => console.warn('[useLiveOrderTracking] Notification update error:', err));
    }
  }, [
    order?.orderId,
    order?.status,
    order?.step,
    order?.etaMinutes,
    order?.etaText,
    order?.riderName,
    order?.riderPhone,
    order?.itemsSummary,
    order?.totalAmount,
    isSupported,
  ]);

  return { isSupported, activityId };
}
