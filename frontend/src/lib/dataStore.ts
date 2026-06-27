import { create } from 'zustand';
import { db } from './firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

interface DataState {
  products: any[];
  combos: any[];
  ads: any[];
  specialCategories: any[];
  coupons: any[];
  isInitialized: boolean;
  initialize: () => void;
  cleanup: () => void;
}

let unsubscribers: (() => void)[] = [];

export const useDataStore = create<DataState>((set, get) => ({
  products: [],
  combos: [],
  ads: [],
  specialCategories: [],
  coupons: [],
  isInitialized: false,
  
  initialize: () => {
    if (get().isInitialized) return;

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

    set({ isInitialized: true });
  },

  cleanup: () => {
    unsubscribers.forEach((unsub) => unsub());
    unsubscribers = [];
    set({ isInitialized: false });
  }
}));
