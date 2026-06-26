import { create } from 'zustand';

// Authentication Store
interface AuthState {
  user: any | null;
  role: 'customer' | 'owner' | 'delivery_partner' | 'admin' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: any, role: 'customer' | 'owner' | 'delivery_partner' | 'admin') => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user, role) => set({ user, role, isAuthenticated: !!user, isLoading: false }),
  logout: () => set({ user: null, role: null, isAuthenticated: false, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));

// Shopping Cart Store
import { CartItem } from '../types/models';

interface CartState {
  items: CartItem[];
  total: number;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  total: 0,
  addItem: (item) => set((state) => {
    const existing = state.items.find(i => i.id === item.id);
    let newItems;
    if (existing) {
      newItems = state.items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i);
    } else {
      newItems = [...state.items, item];
    }
    const total = newItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    return { items: newItems, total };
  }),
  removeItem: (id) => set((state) => {
    const newItems = state.items.filter(i => i.id !== id);
    const total = newItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    return { items: newItems, total };
  }),
  updateQuantity: (id, quantity) => set((state) => {
    const newItems = state.items.map(i => i.id === id ? { ...i, quantity } : i);
    const total = newItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    return { items: newItems, total };
  }),
  clearCart: () => set({ items: [], total: 0 }),
}));

// Owner POS Alert Settings Store
interface OwnerSettingsState {
  enableNewOrderSound: boolean;
  enableReminderSound: boolean;
  enableUrgentSound: boolean;
  enableBrowserNotifications: boolean;
  enableVibrations: boolean;
  repeatInterval: number;
  volumeLevel: number;
  muteMode: boolean;
  updateSettings: (settings: Partial<OwnerSettingsState>) => void;
}

export const useOwnerSettingsStore = create<OwnerSettingsState>((set) => ({
  enableNewOrderSound: true,
  enableReminderSound: true,
  enableUrgentSound: true,
  enableBrowserNotifications: true,
  enableVibrations: true,
  repeatInterval: 60,
  volumeLevel: 0.5,
  muteMode: false,
  updateSettings: (settings) => set((state) => ({ ...state, ...settings })),
}));
