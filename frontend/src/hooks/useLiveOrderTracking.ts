import { useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { auth } from '../lib/firebase';
import { fetchApi } from '../lib/config';

export interface LiveOrderTrackingProps {
  orderId?: string;
  orderNumber?: string;
  status?: string;
  step?: number;
  itemsSummary?: string;
  totalAmount?: number;
  etaMinutes?: number;
  riderName?: string;
  riderPhone?: string;
  restaurantName?: string;
}

interface LiveActivityPlugin {
  areActivitiesEnabled(): Promise<{ enabled: boolean }>;
  startActivity(options: {
    orderId: string;
    orderNumber?: string;
    status: string;
    step: number;
    itemsSummary: string;
    totalAmount: number;
    etaMinutes: number;
    riderName?: string;
    riderPhone?: string;
    restaurantName?: string;
  }): Promise<{ activityId: string; success?: boolean; alreadyActive?: boolean }>;
  updateActivity(options: {
    orderId: string;
    orderNumber?: string;
    status: string;
    step: number;
    itemsSummary: string;
    totalAmount: number;
    etaMinutes: number;
    riderName?: string;
    riderPhone?: string;
    restaurantName?: string;
  }): Promise<{ activityId: string; success?: boolean }>;
  endActivity(options: {
    orderId: string;
    status?: string;
    dismissalSeconds?: number;
  }): Promise<{ success?: boolean; endedCount?: number }>;
  addListener(
    eventName: 'pushTokenReceived',
    listenerFunc: (data: { orderId: string; activityId: string; pushToken: string }) => void
  ): Promise<any>;
}

const LiveActivity = registerPlugin<LiveActivityPlugin>('LiveActivity');

export function useLiveOrderTracking(order?: LiveOrderTrackingProps | null) {
  const [isSupported, setIsSupported] = useState(false);
  const [activityId, setActivityId] = useState<string | null>(null);
  const registeredPushTokensRef = useRef<Set<string>>(new Set());

  // 1. Check support on mount
  useEffect(() => {
    if (Capacitor.getPlatform() === 'ios') {
      LiveActivity.areActivitiesEnabled()
        .then(res => setIsSupported(!!res?.enabled))
        .catch(() => setIsSupported(false));
    }
  }, []);

  // 2. Setup push token listener
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'ios') return;

    let listenerHandle: any = null;
    try {
      LiveActivity.addListener('pushTokenReceived', async (data) => {
        if (!data?.orderId || !data?.pushToken) return;
        const cacheKey = `${data.orderId}_${data.pushToken}`;
        if (registeredPushTokensRef.current.has(cacheKey)) return;
        registeredPushTokensRef.current.add(cacheKey);

        try {
          const authToken = await auth.currentUser?.getIdToken();
          if (!authToken) return;

          await fetchApi('/api/notifications/activity-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              orderId: data.orderId,
              token: data.pushToken,
              deviceId: data.activityId,
            }),
          });
          console.log('[LiveOrderTracking] ActivityKit push token registered with backend:', data.orderId);
        } catch (err: any) {
          console.warn('[LiveOrderTracking] Failed to sync activity push token:', err.message);
        }
      }).then(handle => {
        listenerHandle = handle;
      });
    } catch (e) {
      console.warn('[LiveOrderTracking] Could not attach pushTokenReceived listener:', e);
    }

    return () => {
      if (listenerHandle && typeof listenerHandle.remove === 'function') {
        listenerHandle.remove();
      }
    };
  }, []);

  // 3. Start, update, or end Live Activity when order state changes
  useEffect(() => {
    if (!order?.orderId || Capacitor.getPlatform() !== 'ios' || !isSupported) return;

    const orderId = order.orderId;
    const status = order.status || 'pending';
    const isTerminal = status === 'delivered' || status === 'cancelled' || status === 'completed';

    if (isTerminal) {
      LiveActivity.endActivity({
        orderId,
        status,
        dismissalSeconds: 300,
      }).catch(err => console.warn('[LiveOrderTracking] endActivity failed:', err));
      setActivityId(null);
      return;
    }

    const payload = {
      orderId,
      orderNumber: order.orderNumber || orderId.slice(-6),
      status,
      step: order.step || 1,
      itemsSummary: order.itemsSummary || 'Olive Pizza Order',
      totalAmount: order.totalAmount || 0,
      etaMinutes: order.etaMinutes || 25,
      riderName: order.riderName || '',
      riderPhone: order.riderPhone || '',
      restaurantName: order.restaurantName || 'Olive Pizza',
    };

    LiveActivity.startActivity(payload)
      .then(res => {
        if (res?.activityId) setActivityId(res.activityId);
      })
      .catch(err => {
        console.warn('[LiveOrderTracking] startActivity failed:', err);
      });
  }, [order?.orderId, order?.status, order?.step, order?.etaMinutes, order?.riderName, isSupported]);

  return { isSupported, activityId };
}
