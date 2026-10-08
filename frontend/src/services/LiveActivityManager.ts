/**
 * LiveActivityManager.ts
 *
 * Enterprise Manager for iOS ActivityKit Live Activities & Dynamic Island.
 * - Bridges to native LiveActivity Capacitor plugin.
 * - Requests and registers APNs live activity push tokens with the backend (/api/notifications/activity-token).
 * - Manages lifecycle: start, update in-place, and end with graceful dismissal.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { auth } from '../lib/firebase';
import { fetchApi } from '../lib/config';

export interface LiveActivityPayload {
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
}

export interface LiveActivityPlugin {
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

export const LiveActivity = registerPlugin<LiveActivityPlugin>('LiveActivity');

class LiveActivityManagerClass {
  private isSupportedCached: boolean | null = null;
  private registeredTokens = new Set<string>();
  private activeActivityIds = new Map<string, string>();
  private pushTokenListenerHandle: any = null;

  /**
   * Checks whether ActivityKit Live Activities are supported and enabled on the current device.
   */
  public async areActivitiesEnabled(): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'ios') {
      return false;
    }
    if (this.isSupportedCached !== null) {
      return this.isSupportedCached;
    }

    try {
      const res = await LiveActivity.areActivitiesEnabled();
      this.isSupportedCached = !!res?.enabled;
      return this.isSupportedCached;
    } catch (err) {
      console.warn('[LiveActivityManager] areActivitiesEnabled check failed:', err);
      this.isSupportedCached = false;
      return false;
    }
  }

  /**
   * Registers the native pushTokenReceived listener from ActivityKit
   * and synchronizes new APNs push tokens with the backend.
   */
  public async setupPushTokenListener(): Promise<void> {
    if (Capacitor.getPlatform() !== 'ios' || this.pushTokenListenerHandle) {
      return;
    }

    try {
      this.pushTokenListenerHandle = await LiveActivity.addListener(
        'pushTokenReceived',
        async (data: { orderId: string; activityId: string; pushToken: string }) => {
          if (!data?.orderId || !data?.pushToken) return;

          const cacheKey = `${data.orderId}_${data.pushToken}`;
          if (this.registeredTokens.has(cacheKey)) return;
          this.registeredTokens.add(cacheKey);

          await this.syncPushTokenWithBackend(data.orderId, data.pushToken, data.activityId);
        }
      );
      console.log('[LiveActivityManager] Push token listener established');
    } catch (err) {
      console.warn('[LiveActivityManager] Failed to attach pushTokenReceived listener:', err);
    }
  }

  /**
   * POSTs the APNs Live Activity push token to backend for remote updates.
   */
  public async syncPushTokenWithBackend(orderId: string, pushToken: string, activityId: string): Promise<boolean> {
    try {
      const authToken = await auth.currentUser?.getIdToken();
      if (!authToken) {
        console.warn('[LiveActivityManager] Cannot sync token: user not authenticated');
        return false;
      }

      const res = await fetchApi('/api/notifications/activity-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          orderId,
          token: pushToken,
          deviceId: activityId,
        }),
      });

      if (res.ok) {
        console.log(`[LiveActivityManager] Synced APNs token for order ${orderId}`);
        return true;
      } else {
        const errText = await res.text();
        console.warn(`[LiveActivityManager] Failed to sync token (${res.status}): ${errText}`);
        return false;
      }
    } catch (err: any) {
      console.warn('[LiveActivityManager] Error syncing activity token:', err.message);
      return false;
    }
  }

  /**
   * Starts or updates a Live Activity for an order.
   */
  public async startOrUpdateActivity(payload: LiveActivityPayload): Promise<string | null> {
    const enabled = await this.areActivitiesEnabled();
    if (!enabled) return null;

    await this.setupPushTokenListener();

    try {
      const res = await LiveActivity.startActivity({
        orderId: payload.orderId,
        orderNumber: payload.orderNumber || payload.orderId.slice(-6),
        status: payload.status,
        step: payload.step,
        itemsSummary: payload.itemsSummary,
        totalAmount: payload.totalAmount,
        etaMinutes: payload.etaMinutes,
        riderName: payload.riderName,
        riderPhone: payload.riderPhone,
        restaurantName: payload.restaurantName || 'Olive Pizza',
      });

      if (res?.activityId) {
        this.activeActivityIds.set(payload.orderId, res.activityId);
        return res.activityId;
      }
      return null;
    } catch (err) {
      console.warn('[LiveActivityManager] startActivity failed:', err);
      return null;
    }
  }

  /**
   * Updates an existing Live Activity in-place.
   */
  public async updateActivity(payload: LiveActivityPayload): Promise<boolean> {
    const enabled = await this.areActivitiesEnabled();
    if (!enabled) return false;

    try {
      const res = await LiveActivity.updateActivity({
        orderId: payload.orderId,
        orderNumber: payload.orderNumber || payload.orderId.slice(-6),
        status: payload.status,
        step: payload.step,
        itemsSummary: payload.itemsSummary,
        totalAmount: payload.totalAmount,
        etaMinutes: payload.etaMinutes,
        riderName: payload.riderName,
        riderPhone: payload.riderPhone,
        restaurantName: payload.restaurantName || 'Olive Pizza',
      });
      return !!res?.success;
    } catch (err) {
      console.warn('[LiveActivityManager] updateActivity failed:', err);
      return false;
    }
  }

  /**
   * Ends the Live Activity when order is delivered or cancelled.
   */
  public async endActivity(orderId: string, status: string = 'delivered', dismissalSeconds: number = 300): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'ios') return false;

    try {
      const res = await LiveActivity.endActivity({
        orderId,
        status,
        dismissalSeconds,
      });
      this.activeActivityIds.delete(orderId);
      return !!res?.success;
    } catch (err) {
      console.warn('[LiveActivityManager] endActivity failed:', err);
      return false;
    }
  }

  /**
   * Cleans up listeners when unmounting.
   */
  public cleanup(): void {
    if (this.pushTokenListenerHandle && typeof this.pushTokenListenerHandle.remove === 'function') {
      this.pushTokenListenerHandle.remove();
      this.pushTokenListenerHandle = null;
    }
  }
}

export const LiveActivityManager = new LiveActivityManagerClass();
