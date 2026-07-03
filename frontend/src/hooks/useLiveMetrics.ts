import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export const useLiveMetrics = () => {
  const [metrics, setMetrics] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    pending: 0,
    preparing: 0,
    outForDelivery: 0,
    completed: 0,
    cancelled: 0,
    activeCustomers: 0,
    partnersOnline: 0,
    ownersOnline: 0,
    error: null as string | null,
  });

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ordersRef = collection(db, "orders");
    const qToday = query(ordersRef, where("createdAt", ">=", today.toISOString()));

    let unsubOrders: (() => void) | null = null;
    let unsubPartners: (() => void) | null = null;

    try {
      unsubOrders = onSnapshot(qToday, (snapshot) => {
        let revenue = 0, count = 0, pending = 0, preparing = 0, outForDelivery = 0, completed = 0, cancelled = 0;
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          count++;
          revenue += data.totalAmount || 0;
          if (data.status === 'pending') pending++;
          else if (data.status === 'preparing') preparing++;
          else if (data.status === 'out_for_delivery') outForDelivery++;
          else if (data.status === 'delivered') completed++;
          else if (data.status === 'cancelled') cancelled++;
        });
        setMetrics(prev => ({ ...prev, todayRevenue: revenue, todayOrders: count, pending, preparing, outForDelivery, completed, cancelled, error: null }));
      }, (error) => {
        console.warn('[useLiveMetrics] Firestore orders error:', error.code || error.message);
        setMetrics(prev => ({ ...prev, error: error.code || 'Network error' }));
      });
    } catch (e: any) {
      console.error('[useLiveMetrics] Failed to subscribe:', e.message);
    }

    try {
      unsubPartners = onSnapshot(
        query(collection(db, "users"), where("role", "==", "delivery_partner")),
        (snapshot) => { setMetrics(prev => ({ ...prev, partnersOnline: snapshot.docs.length, ownersOnline: 1 })); },
        (error) => { console.warn('[useLiveMetrics] Partners error:', error.code); }
      );
    } catch (e: any) {
      console.warn('[useLiveMetrics] Failed to subscribe to partners:', e.message);
    }

    return () => {
      if (unsubOrders) unsubOrders();
      if (unsubPartners) unsubPartners();
    };
  }, []);

  return metrics;
};
