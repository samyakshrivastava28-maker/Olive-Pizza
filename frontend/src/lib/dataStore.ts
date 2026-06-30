import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { db } from './firebase';
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';

interface DataState {
  products: any[];
  combos: any[];
  ads: any[];
  specialCategories: any[];
  coupons: any[];
  storeStatus: {
    isRestaurantOpen: boolean;
    isDeliveryAvailable: boolean;
    isLoading: boolean;
    isWithinBusinessHours: boolean;
    deliveryRadiusKm: number;
  };
  isInitialized: boolean;
  isInitializing: boolean;
  initialize: () => void;
  cleanup: () => void;
}

const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

let unsubscribers: (() => void)[] = [];
let isInitializingLock = false;

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      products: [],
      combos: [],
      ads: [],
      specialCategories: [],
      coupons: [],
      storeStatus: {
        isRestaurantOpen: true,
        isDeliveryAvailable: true,
        isLoading: true,
        isWithinBusinessHours: true,
        deliveryRadiusKm: 5
      },
      isInitialized: false,
      isInitializing: false,
      
      initialize: () => {
        if (get().isInitialized || get().isInitializing || isInitializingLock) return;
        isInitializingLock = true;
        set({ isInitializing: true });

        // Clear existing to prevent leaks in React Strict Mode double-invocations
        unsubscribers.forEach((unsub) => unsub());
        unsubscribers = [];

        import('./config').then(({ OPENING_HOUR, CLOSING_HOUR }) => {
          const currentHour = new Date().getHours();
          const isWithinHours = currentHour >= OPENING_HOUR && currentHour < CLOSING_HOUR;
          set((state) => ({ storeStatus: { ...state.storeStatus, isWithinBusinessHours: isWithinHours } }));
        });

        // Fetch Global Settings / Store Status
        const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
          import('./config').then(({ OPENING_HOUR, CLOSING_HOUR }) => {
            const currentHour = new Date().getHours();
            const isWithinHours = currentHour >= OPENING_HOUR && currentHour < CLOSING_HOUR;
            
            if (snap.exists()) {
              const data = snap.data();
              set({ storeStatus: {
                isRestaurantOpen: data.isRestaurantOpen ?? true,
                isDeliveryAvailable: data.isDeliveryAvailable ?? true,
                isLoading: false,
                isWithinBusinessHours: isWithinHours,
                deliveryRadiusKm: data.deliveryRadiusKm ?? 5
              }});
            } else {
              set((state) => ({ storeStatus: { ...state.storeStatus, isLoading: false, isWithinBusinessHours: isWithinHours }}));
            }
          });
        });
        unsubscribers.push(unsubSettings);

        // Fetch Products (Active only)
        const unsubProducts = onSnapshot(
          query(collection(db, 'products'), where('isActive', '==', true)),
          (snap) => {
            const products = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            products.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
            set({ products });
          }
        );
        unsubscribers.push(unsubProducts);

        // Fetch Combos (Active only)
        const unsubCombos = onSnapshot(
          query(collection(db, 'combos'), where('isActive', '==', true)),
          (snap) => {
            const combos = snap.docs.map((doc) => ({ id: doc.id, ...doc.data(), isCombo: true }));
            combos.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
            set({ combos });
          }
        );
        unsubscribers.push(unsubCombos);

        // Fetch Ads
        const unsubAds = onSnapshot(
          query(collection(db, 'ads'), where('isActive', '==', true)),
          (snap) => {
            const ads = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            ads.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
            set({ ads });
          }
        );
        unsubscribers.push(unsubAds);
        
        // Fetch Special Categories
        const unsubSpecial = onSnapshot(
          query(collection(db, 'special_categories'), where('isActive', '==', true)),
          (snap) => {
            const categories = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            categories.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            set({ specialCategories: categories });
          }
        );
        unsubscribers.push(unsubSpecial);

        // Fetch Coupons
        const unsubCoupons = onSnapshot(
          query(collection(db, 'coupons'), where('isActive', '==', true)),
          (snap) => {
            const coupons = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            set({ coupons });
          }
        );
        unsubscribers.push(unsubCoupons);

        set({ isInitialized: true, isInitializing: false });
        isInitializingLock = false;
      },

      cleanup: () => {
        unsubscribers.forEach((unsub) => unsub());
        unsubscribers = [];
        isInitializingLock = false;
        set({ isInitialized: false, isInitializing: false });
      }
    }),
    {
      name: 'olive-pizza-data-cache',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        products: state.products,
        combos: state.combos,
        ads: state.ads,
        specialCategories: state.specialCategories,
        coupons: state.coupons,
        storeStatus: state.storeStatus,
      }), // ONLY persist data. DO NOT persist isInitialized so listeners always attach once per app load.
    }
  )
);
