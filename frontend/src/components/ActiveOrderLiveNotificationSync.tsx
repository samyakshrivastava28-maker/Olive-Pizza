import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { db, auth } from '../lib/firebase';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuthStore } from '../lib/store';
import { useLiveOrderTracking } from '../hooks/useLiveOrderTracking';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

const ACTIVE_STATUSES = new Set([
  'pending',
  'placed',
  'accepted',
  'confirmed',
  'preparing',
  'in_preparation',
  'cooking',
  'ready',
  'packed',
  'partner_assigned',
  'picked_up',
  'out_for_delivery',
]);

/**
 * ActiveOrderLiveNotificationSync
 *
 * Global background synchronizer that maintains persistent ongoing notifications
 * and ActivityKit state even when navigating away from the order tracking screen.
 */
export default function ActiveOrderLiveNotificationSync() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const activeOrderIdRef = useRef<string | null>(null);

  // 1. Handle Deep Linking via Capacitor App urlOpen (olivepizza://app/order-tracking/...)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let subHandle: any = null;
    CapApp.addListener('appUrlOpen', (event) => {
      try {
        const rawUrl = event.url;
        if (!rawUrl) return;
        const match = rawUrl.match(/order-tracking\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          navigate(`/order-tracking/${match[1]}`);
        }
      } catch (err) {
        console.warn('[ActiveOrderLiveSync] appUrlOpen error:', err);
      }
    }).then(handle => {
      subHandle = handle;
    });

    return () => {
      if (subHandle && typeof subHandle.remove === 'function') {
        subHandle.remove();
      }
    };
  }, [navigate]);

  // 2. Discover and listen to active order in real time from Firestore
  useEffect(() => {
    // If customer is currently on OrderTracking page, OrderTracking itself drives the live notification
    if (location.pathname.startsWith('/order-tracking/')) {
      return;
    }

    let unsubDoc: (() => void) | null = null;

    const attachDocListener = (orderId: string) => {
      if (activeOrderIdRef.current === orderId && unsubDoc) return;
      activeOrderIdRef.current = orderId;

      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }

      unsubDoc = onSnapshot(
        doc(db, 'orders', orderId),
        (snap) => {
          if (!snap.exists()) {
            setActiveOrder(null);
            activeOrderIdRef.current = null;
            return;
          }

          const data = { id: snap.id, ...(snap.data() as any) };
          const status = (data.status || '').toLowerCase();

          // Active order or freshly transitioned terminal state
          if (ACTIVE_STATUSES.has(status) || status === 'delivered' || status === 'cancelled') {
            setActiveOrder(data);
          }

          if (status === 'delivered' || status === 'cancelled') {
            try {
              localStorage.removeItem('activeOrderId');
            } catch {}
            // Gracefully unbind listener after terminal delivery notification posted
            setTimeout(() => {
              if (activeOrderIdRef.current === orderId) {
                setActiveOrder(null);
                activeOrderIdRef.current = null;
              }
            }, 3500);
          }
        },
        (err) => {
          console.warn('[ActiveOrderLiveSync] Firestore order listener error:', err);
        }
      );
    };

    // Step A: Check local storage for active order ID
    const cachedId = localStorage.getItem('activeOrderId') || localStorage.getItem('lastPlacedOrderId');
    if (cachedId) {
      attachDocListener(cachedId);
      return () => {
        if (unsubDoc) unsubDoc();
      };
    }

    // Step B: Query active order of authenticated user from Firestore
    const currentUid = user?.uid || auth.currentUser?.uid;
    if (currentUid && isAuthenticated) {
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', currentUid),
        where('status', 'in', ['pending', 'placed', 'accepted', 'preparing', 'ready', 'partner_assigned', 'picked_up', 'out_for_delivery'])
      );

      getDocs(q).then((snap) => {
        if (!snap.empty) {
          const docItem = snap.docs[0];
          attachDocListener(docItem.id);
        }
      }).catch(err => {
        console.warn('[ActiveOrderLiveSync] Failed to query user active orders:', err);
      });
    }

    return () => {
      if (unsubDoc) unsubDoc();
    };
  }, [location.pathname, user?.uid, isAuthenticated]);

  const itemsSummary = activeOrder?.items && Array.isArray(activeOrder.items)
    ? activeOrder.items.map((i: any) => typeof i === 'string' ? i : `${i.quantity || 1}× ${i.name || 'Item'}`).join(', ')
    : '';

  useLiveOrderTracking(
    activeOrder
      ? {
          orderId: activeOrder.id,
          orderNumber: activeOrder.orderNumber || activeOrder.id?.slice(-6),
          status: activeOrder.status,
          itemsSummary,
          totalAmount: Number(activeOrder.totalAmount || 0),
          etaMinutes: activeOrder.estimatedDeliveryMinutes || (activeOrder.eta ? parseInt(activeOrder.eta) : 25),
          etaText: activeOrder.eta ? String(activeOrder.eta) : undefined,
          riderName: activeOrder.deliveryPartnerName || '',
          riderPhone: activeOrder.deliveryPartnerPhone || '',
          restaurantName: 'Olive Pizza',
        }
      : null
  );

  return null;
}
