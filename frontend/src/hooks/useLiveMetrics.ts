import { create } from 'zustand';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface MetricsState {
  todayRevenue: number;
  todayOrders: number;
  pending: number;
  preparing: number;
  outForDelivery: number;
  completed: number;
  cancelled: number;
  activeCustomers: number;
  partnersOnline: number;
  ownersOnline: number;
  error: string | null;
  isInitialized: boolean;
  init: () => void;
  cleanup: () => void;
}

let unsubOrders: (() => void) | null = null;
let unsubPartners: (() => void) | null = null;

export const useLiveMetricsStore = create<MetricsState>((set, get) => ({
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
  error: null,
  isInitialized: false,

  init: () => {
    if (get().isInitialized) return; // Prevent duplicate listeners

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ordersRef = collection(db, "orders");
    const qToday = query(ordersRef, where("createdAt", ">=", today.toISOString()));

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
        set({ 
          todayRevenue: revenue, 
          todayOrders: count, 
          pending, 
          preparing, 
          outForDelivery, 
          completed, 
          cancelled, 
          error: null 
        });
      }, (error) => {
        console.warn('[useLiveMetrics] Firestore orders error:', error.code || error.message);
        set({ error: error.code || 'Network error' });
      });
    } catch (e: any) {
      console.error('[useLiveMetrics] Failed to subscribe:', e.message);
    }

    try {
      unsubPartners = onSnapshot(
        query(collection(db, "users"), where("role", "==", "delivery_partner")),
        (snapshot) => { set({ partnersOnline: snapshot.docs.length, ownersOnline: 1 }); },
        (error) => { console.warn('[useLiveMetrics] Partners error:', error.code); }
      );
    } catch (e: any) {
      console.warn('[useLiveMetrics] Failed to subscribe to partners:', e.message);
    }

    set({ isInitialized: true });
  },

  cleanup: () => {
    if (unsubOrders) {
      unsubOrders();
      unsubOrders = null;
    }
    if (unsubPartners) {
      unsubPartners();
      unsubPartners = null;
    }
    set({ isInitialized: false });
  }
}));

// Wrapper hook to keep API identical for existing components, while fixing the underlying memory leak
import { useEffect } from 'react';
export const useLiveMetrics = () => {
  const store = useLiveMetricsStore();
  
  useEffect(() => {
    store.init();
    // We don't cleanup on unmount because we want the singleton to persist across component unmounts (e.g. tabs).
    // The App or Auth provider should handle global cleanup if the user logs out.
  }, [store]);

  return store;
};
