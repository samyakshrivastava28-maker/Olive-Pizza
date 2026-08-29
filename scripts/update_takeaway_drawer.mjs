import fs from 'fs';
import path from 'path';

const POS_DIR = 'C:/Users/RYZEN/Downloads/olive-pizza-pos';

// 1. types/pos.ts
const typesPosContent = `export type OrderSourceType = 'POS_DINE_IN' | 'POS_TAKEAWAY' | 'POS_DELIVERY' | 'OFFLINE_RESTAURANT';

export interface POSProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  basePrice?: number;
  imageUrl?: string;
  isAvailable?: boolean;
  description?: string;
  sizes?: Array<{ name: string; price: number }>;
  crusts?: Array<{ name: string; price: number }>;
  availableAddons?: Array<{ id: string; name: string; price: number }>;
}

export interface POSCartItemAddon {
  id: string;
  name: string;
  price: number;
}

export interface POSCartItem {
  cartItemId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  crust: string;
  addons: POSCartItemAddon[];
  kitchenNotes?: string;
  image?: string;
}

export interface POSTerminalSession {
  cashierName: string;
  cashierUid: string;
  terminalId: string;
  branchId: string;
  branchName: string;
  franchiseId: string;
  organizationId: string;
  token?: string;
}

export interface POSPaymentDetails {
  method: 'CASH' | 'UPI' | 'CARD' | 'SPLIT';
  cashReceived?: number;
  cashChange?: number;
  upiAmount?: number;
  cardAmount?: number;
  splitCash?: number;
  splitUPI?: number;
  splitCard?: number;
  transactionRef?: string;
}

export interface POSTakeawayDetails {
  pickupEstimate: string; // '10 mins' | '15 mins' | '20 mins' | '30 mins'
  pickupType: 'COUNTER' | 'CURBSIDE';
  vehicleNumber?: string;
  pickupNote?: string;
}

export interface POSCompletedBill {
  billNumber: string;
  orderId: string;
  orderSource: OrderSourceType;
  tableNumber?: string;
  takeawayDetails?: POSTakeawayDetails;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  items: POSCartItem[];
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  taxAmount: number; // 5% GST
  deliveryFee: number;
  finalTotal: number;
  payment: POSPaymentDetails;
  session: POSTerminalSession;
  createdAt: string;
}
`;

// 2. store/posStore.ts
const posStoreContent = `import { create } from 'zustand';
import { POSCartItem, OrderSourceType, POSTerminalSession, POSCompletedBill, POSTakeawayDetails } from '../types/pos';

interface POSState {
  // Session
  session: POSTerminalSession | null;
  setSession: (session: POSTerminalSession | null) => void;

  // Order Details
  orderSource: OrderSourceType;
  setOrderSource: (source: OrderSourceType) => void;
  tableNumber: string;
  setTableNumber: (table: string) => void;

  // Takeaway Details
  takeawayDetails: POSTakeawayDetails;
  setTakeawayDetails: (details: Partial<POSTakeawayDetails>) => void;

  // Customer Details
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryFee: number;
  setDeliveryFee: (fee: number) => void;
  setCustomer: (details: { name?: string; phone?: string; address?: string }) => void;

  // Cart Items
  items: POSCartItem[];
  addItem: (item: Omit<POSCartItem, 'cartItemId'>) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;

  // Discounts & Coupons
  discountAmount: number;
  couponCode: string;
  setDiscountAmount: (amount: number) => void;
  setCouponCode: (code: string) => void;

  // Mobile Bottom Sheet / Drawers
  isMobileCartOpen: boolean;
  setIsMobileCartOpen: (open: boolean) => void;
  isHistoryOpen: boolean;
  setIsHistoryOpen: (open: boolean) => void;

  // Last Completed Bill (for Receipt printing/preview)
  lastCompletedBill: POSCompletedBill | null;
  setLastCompletedBill: (bill: POSCompletedBill | null) => void;

  // Reset entire order state
  resetOrder: () => void;
}

export const usePOSStore = create<POSState>((set, get) => ({
  session: null,
  setSession: (session) => set({ session }),

  orderSource: 'POS_DINE_IN',
  setOrderSource: (orderSource) => set({ 
    orderSource,
    deliveryFee: orderSource === 'POS_DELIVERY' ? 30 : 0
  }),
  tableNumber: 'T-1',
  setTableNumber: (tableNumber) => set({ tableNumber }),

  takeawayDetails: {
    pickupEstimate: '15 mins',
    pickupType: 'COUNTER',
    vehicleNumber: '',
    pickupNote: '',
  },
  setTakeawayDetails: (details) =>
    set((state) => ({
      takeawayDetails: { ...state.takeawayDetails, ...details },
    })),

  customerName: 'Walk-in Customer',
  customerPhone: '',
  deliveryAddress: '',
  deliveryFee: 0,
  setDeliveryFee: (deliveryFee) => set({ deliveryFee }),
  setCustomer: (details) =>
    set((state) => ({
      customerName: details.name !== undefined ? details.name : state.customerName,
      customerPhone: details.phone !== undefined ? details.phone : state.customerPhone,
      deliveryAddress: details.address !== undefined ? details.address : state.deliveryAddress,
    })),

  items: [],
  addItem: (newItem) =>
    set((state) => {
      const cartItemId = \`\${newItem.productId}-\${newItem.size}-\${newItem.crust}-\${(newItem.addons || []).map((a) => a.id).sort().join('_')}-\${newItem.kitchenNotes || ''}\`;
      const existingIdx = state.items.findIndex((it) => it.cartItemId === cartItemId);

      if (existingIdx > -1) {
        const updated = [...state.items];
        updated[existingIdx].quantity += newItem.quantity || 1;
        return { items: updated };
      }

      return {
        items: [
          ...state.items,
          {
            ...newItem,
            cartItemId,
            quantity: newItem.quantity || 1,
          },
        ],
      };
    }),

  updateQuantity: (cartItemId, delta) =>
    set((state) => {
      const updated = state.items
        .map((it) => {
          if (it.cartItemId === cartItemId) {
            const newQty = it.quantity + delta;
            return newQty > 0 ? { ...it, quantity: newQty } : null;
          }
          return it;
        })
        .filter(Boolean) as POSCartItem[];

      return { items: updated };
    }),

  removeItem: (cartItemId) =>
    set((state) => ({
      items: state.items.filter((it) => it.cartItemId !== cartItemId),
    })),

  clearCart: () =>
    set({
      items: [],
      discountAmount: 0,
      couponCode: '',
    }),

  discountAmount: 0,
  couponCode: '',
  setDiscountAmount: (discountAmount) => set({ discountAmount }),
  setCouponCode: (couponCode) => set({ couponCode }),

  isMobileCartOpen: false,
  setIsMobileCartOpen: (isMobileCartOpen) => set({ isMobileCartOpen }),
  isHistoryOpen: false,
  setIsHistoryOpen: (isHistoryOpen) => set({ isHistoryOpen }),

  lastCompletedBill: null,
  setLastCompletedBill: (lastCompletedBill) => set({ lastCompletedBill }),

  resetOrder: () =>
    set((state) => ({
      items: [],
      discountAmount: 0,
      couponCode: '',
      customerName: 'Walk-in Customer',
      customerPhone: '',
      deliveryAddress: '',
      tableNumber: 'T-1',
      takeawayDetails: {
        pickupEstimate: '15 mins',
        pickupType: 'COUNTER',
        vehicleNumber: '',
        pickupNote: '',
      },
      deliveryFee: state.orderSource === 'POS_DELIVERY' ? 30 : 0,
    })),
}));

export const getPOSCalculations = (state: { items: POSCartItem[]; discountAmount: number; deliveryFee?: number }) => {
  const subtotal = state.items.reduce((sum, it) => {
    const addonsTotal = (it.addons || []).reduce((aSum, a) => aSum + a.price, 0);
    return sum + (it.price + addonsTotal) * it.quantity;
  }, 0);

  const discount = Math.min(state.discountAmount || 0, subtotal);
  const taxableAmount = Math.max(0, subtotal - discount);
  const taxAmount = Math.round(taxableAmount * 0.05); // 5% GST
  const deliveryFee = state.deliveryFee || 0;
  const finalTotal = taxableAmount + taxAmount + deliveryFee;

  return {
    subtotal,
    discountAmount: discount,
    taxAmount,
    deliveryFee,
    finalTotal,
    itemCount: state.items.reduce((sum, it) => sum + it.quantity, 0),
  };
};
`;

// 3. components/pos/CartPanel.tsx (with Takeaway Pickup Options + Mobile Bottom Sheet Drawer)
const cartPanelContent = `import React, { useState } from 'react';
import { usePOSStore, getPOSCalculations } from '../../store/posStore';
import { OrderSourceType } from '../../types/pos';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { 
  Trash2, Plus, Minus, CreditCard, Tag, UtensilsCrossed, ShoppingBag, 
  Bike, Phone, User, MapPin, Search, CheckCircle2, RotateCcw, Clock, Car, ChevronUp, X
} from 'lucide-react';

interface CartPanelProps {
  onOpenPayment: () => void;
}

const TABLE_LIST = ['T-1', 'T-2', 'T-3', 'T-4', 'T-5', 'T-6', 'T-7', 'T-8', 'T-9', 'T-10', 'T-11', 'T-12'];
const PICKUP_TIMES = ['10 mins', '15 mins', '20 mins', '30 mins', '45 mins'];

const QUICK_DISCOUNTS = [
  { label: '5%', percent: 0.05 },
  { label: '10%', percent: 0.10 },
  { label: '15%', percent: 0.15 },
  { label: 'Flat ₹50', flat: 50 },
  { label: 'Flat ₹100', flat: 100 },
];

export const CartPanel: React.FC<CartPanelProps> = ({ onOpenPayment }) => {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    orderSource,
    setOrderSource,
    tableNumber,
    setTableNumber,
    takeawayDetails,
    setTakeawayDetails,
    customerName,
    customerPhone,
    deliveryAddress,
    deliveryFee,
    setDeliveryFee,
    setCustomer,
    discountAmount,
    setDiscountAmount,
    resetOrder,
    isMobileCartOpen,
    setIsMobileCartOpen,
  } = usePOSStore();

  const [lookupLoading, setLookupLoading] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);

  const calcs = getPOSCalculations({ items, discountAmount, deliveryFee });

  // Realtime customer lookup by phone
  const handlePhoneChange = async (phone: string) => {
    setCustomer({ phone });
    setCustomerFound(false);

    if (phone.length === 10) {
      setLookupLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('phone', '==', phone), limit(1));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const u = snap.docs[0].data();
          setCustomer({
            name: u.name || 'Returning Customer',
            address: u.addresses?.[0]?.addressLine || u.address || '',
          });
          setCustomerFound(true);
        }
      } catch (err) {
        console.warn('Customer lookup error:', err);
      } finally {
        setLookupLoading(false);
      }
    }
  };

  const applyDiscount = (d: { percent?: number; flat?: number }) => {
    if (d.percent) {
      setDiscountAmount(Math.round(calcs.subtotal * d.percent));
    } else if (d.flat) {
      setDiscountAmount(d.flat);
    }
  };

  return (
    <>
      {/* Mobile Floating Cart Summary Bar (visible on small/medium screens) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 p-3 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold font-mono">
            {calcs.itemCount}
          </div>
          <div>
            <div className="text-xs text-zinc-400 font-medium">
              {orderSource.replace('POS_', '')} {orderSource === 'POS_DINE_IN' && \`• \${tableNumber}\`}
            </div>
            <div className="text-base font-mono font-black text-emerald-400">
              ₹{calcs.finalTotal}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <span>View Bill</span>
            <ChevronUp className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenPayment}
            disabled={items.length === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-zinc-950 font-black text-xs rounded-xl shadow-lg transition disabled:opacity-40"
          >
            Pay Now
          </button>
        </div>
      </div>

      {/* Main Cart Panel / Bottom Sheet Drawer */}
      <aside
        className={\`w-96 bg-zinc-950 border-l border-zinc-800 flex flex-col h-full select-none \${
          isMobileCartOpen
            ? 'fixed inset-y-0 right-0 z-50 w-full sm:w-96 shadow-2xl animate-in slide-in-from-right duration-200'
            : 'hidden lg:flex'
        }\`}
      >
        {/* Mobile Drawer Top Drag Bar & Close */}
        {isMobileCartOpen && (
          <div className="lg:hidden p-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-white">
              <span>🧾 Current Bill & Options</span>
            </div>
            <button
              onClick={() => setIsMobileCartOpen(false)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* 1. Order Type Mode Selector */}
        <div className="p-3 border-b border-zinc-800 bg-zinc-900/60">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setOrderSource('POS_DINE_IN')}
              className={\`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition active:scale-95 \${
                orderSource === 'POS_DINE_IN'
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }\`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Dine-In</span>
            </button>

            <button
              type="button"
              onClick={() => setOrderSource('POS_TAKEAWAY')}
              className={\`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition active:scale-95 \${
                orderSource === 'POS_TAKEAWAY'
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }\`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Takeaway</span>
            </button>

            <button
              type="button"
              onClick={() => setOrderSource('POS_DELIVERY')}
              className={\`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition active:scale-95 \${
                orderSource === 'POS_DELIVERY'
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }\`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Delivery</span>
            </button>
          </div>

          {/* Sub-mode Options: Table Picker for Dine-In */}
          {orderSource === 'POS_DINE_IN' && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 mb-1">
                <span>Select Table:</span>
                <span className="font-mono text-amber-400 font-bold">{tableNumber}</span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {TABLE_LIST.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTableNumber(t)}
                    className={\`py-1 text-xs font-mono font-bold rounded-md border transition \${
                      tableNumber === t
                        ? 'bg-amber-500 text-zinc-950 border-amber-500'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }\`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sub-mode Options: For TAKEAWAY (Pickup info, Prep Time & Pickup Type) */}
          {orderSource === 'POS_TAKEAWAY' && (
            <div className="mt-2.5 p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  Estimated Ready Time:
                </span>
                <span className="text-xs font-mono text-amber-400 font-bold">
                  {takeawayDetails.pickupEstimate}
                </span>
              </div>

              {/* Quick Pickup Time Chips */}
              <div className="grid grid-cols-5 gap-1">
                {PICKUP_TIMES.map((timeChip) => (
                  <button
                    key={timeChip}
                    type="button"
                    onClick={() => setTakeawayDetails({ pickupEstimate: timeChip })}
                    className={\`py-1 text-[10px] font-semibold rounded border transition \${
                      takeawayDetails.pickupEstimate === timeChip
                        ? 'bg-amber-500 text-zinc-950 border-amber-500 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }\`}
                  >
                    {timeChip}
                  </button>
                ))}
              </div>

              {/* Pickup Mode: Counter vs Curbside */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setTakeawayDetails({ pickupType: 'COUNTER' })}
                  className={\`py-1.5 px-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1 transition \${
                    takeawayDetails.pickupType === 'COUNTER'
                      ? 'bg-zinc-800 text-amber-400 border-amber-500/50'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }\`}
                >
                  <ShoppingBag className="w-3 h-3" />
                  <span>Counter Pickup</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTakeawayDetails({ pickupType: 'CURBSIDE' })}
                  className={\`py-1.5 px-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1 transition \${
                    takeawayDetails.pickupType === 'CURBSIDE'
                      ? 'bg-zinc-800 text-amber-400 border-amber-500/50'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }\`}
                >
                  <Car className="w-3 h-3" />
                  <span>Car / Curbside</span>
                </button>
              </div>

              {takeawayDetails.pickupType === 'CURBSIDE' && (
                <input
                  type="text"
                  placeholder="Vehicle / Car Number (e.g. CG 08 AB 1234)..."
                  value={takeawayDetails.vehicleNumber || ''}
                  onChange={(e) => setTakeawayDetails({ vehicleNumber: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              )}
            </div>
          )}
        </div>

        {/* 2. Customer Information (Manual / Optional Lookup) */}
        <div className="p-3 border-b border-zinc-800 bg-zinc-900/30 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Phone className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                placeholder="Customer Phone (10 digits)..."
                maxLength={10}
                value={customerPhone}
                onChange={(e) => handlePhoneChange(e.target.value.replace(/\\D/g, ''))}
                className="w-full pl-8 pr-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
              {customerFound && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              )}
            </div>
            <div className="relative flex-1">
              <User className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Customer Name..."
                value={customerName}
                onChange={(e) => setCustomer({ name: e.target.value })}
                className="w-full pl-8 pr-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {orderSource === 'POS_DELIVERY' && (
            <div className="space-y-1.5 pt-1">
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Delivery street address & landmark..."
                  value={deliveryAddress}
                  onChange={(e) => setCustomer({ address: e.target.value })}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-zinc-400">Delivery Fee (₹):</span>
                <input
                  type="number"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(Math.max(0, Number(e.target.value) || 0))}
                  className="w-20 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-right font-mono text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Items in Current Bill */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-center py-10">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-2 text-xl">
                🧾
              </div>
              <p className="text-sm font-semibold text-zinc-400">Current Bill is Empty</p>
              <p className="text-xs text-zinc-600 max-w-[200px] mt-1">
                Select products from the catalog to build customer's bill
              </p>
            </div>
          ) : (
            items.map((it) => {
              const addonsPrice = (it.addons || []).reduce((s, a) => s + a.price, 0);
              const lineTotal = (it.price + addonsPrice) * it.quantity;

              return (
                <div
                  key={it.cartItemId}
                  className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 flex items-start justify-between gap-2 hover:border-zinc-700 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-zinc-200 truncate">{it.name}</div>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                      <span className="font-medium text-amber-400/90">{it.size}</span>
                      <span>•</span>
                      <span className="truncate">{it.crust}</span>
                    </div>

                    {it.addons && it.addons.length > 0 && (
                      <div className="text-[10px] text-emerald-400 mt-1 leading-tight">
                        + {it.addons.map((a) => a.name).join(', ')}
                      </div>
                    )}

                    {it.kitchenNotes && (
                      <div className="text-[10px] text-amber-400/80 italic mt-0.5">
                        Note: {it.kitchenNotes}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <div className="font-mono font-bold text-xs text-white">₹{lineTotal}</div>
                    <div className="flex items-center gap-1 bg-zinc-950 px-1.5 py-0.5 rounded-lg border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => updateQuantity(it.cartItemId, -1)}
                        className="w-5 h-5 rounded text-zinc-400 hover:text-white flex items-center justify-center transition active:scale-90"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold text-xs text-zinc-200 w-4 text-center">
                        {it.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(it.cartItemId, 1)}
                        className="w-5 h-5 rounded text-zinc-400 hover:text-white flex items-center justify-center transition active:scale-90"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 4. Discounts & Calculations Summary */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/70 space-y-2.5">
          {/* Quick Discount Buttons */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 mb-1">
              <span>Quick Cashier Discount:</span>
              {discountAmount > 0 && (
                <button
                  onClick={() => setDiscountAmount(0)}
                  className="text-red-400 hover:underline text-[10px]"
                >
                  Clear Discount
                </button>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1">
              {QUICK_DISCOUNTS.map((qd) => (
                <button
                  key={qd.label}
                  type="button"
                  onClick={() => applyDiscount(qd)}
                  disabled={items.length === 0}
                  className="py-1 text-[11px] font-bold rounded bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-amber-500/50 hover:text-amber-400 transition disabled:opacity-40"
                >
                  {qd.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bill Calculations Breakdown */}
          <div className="space-y-1 text-xs text-zinc-400 pt-1 border-t border-zinc-800/60">
            <div className="flex justify-between">
              <span>Subtotal ({calcs.itemCount} items)</span>
              <span className="font-mono text-zinc-200">₹{calcs.subtotal}</span>
            </div>

            {calcs.discountAmount > 0 && (
              <div className="flex justify-between text-amber-400 font-semibold">
                <span>Discount</span>
                <span className="font-mono">-₹{calcs.discountAmount}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>GST Taxes (5%)</span>
              <span className="font-mono text-zinc-200">₹{calcs.taxAmount}</span>
            </div>

            {calcs.deliveryFee > 0 && (
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="font-mono text-zinc-200">₹{calcs.deliveryFee}</span>
              </div>
            )}

            <div className="flex justify-between items-baseline pt-1.5 border-t border-zinc-800 text-sm font-bold text-white">
              <span className="text-zinc-200">Total Due</span>
              <span className="text-xl font-mono text-emerald-400 font-black">₹{calcs.finalTotal}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            <button
              type="button"
              onClick={resetOrder}
              disabled={items.length === 0}
              className="py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-red-400 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition active:scale-95 disabled:opacity-40"
              title="Clear Bill (F4)"
            >
              <RotateCcw className="w-4 h-4" />
              <span>F4</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMobileCartOpen(false);
                onOpenPayment();
              }}
              disabled={items.length === 0}
              className="col-span-3 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-40"
            >
              <CreditCard className="w-4 h-4 stroke-[2.5]" />
              <span>Settle & Pay (Enter)</span>
              <span className="font-mono text-base border-l border-zinc-950/20 pl-2">₹{calcs.finalTotal}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
`;

// 4. components/pos/PaymentModal.tsx (including takeawayDetails in order payload)
const paymentModalContent = `import React, { useState } from 'react';
import { usePOSStore, getPOSCalculations } from '../../store/posStore';
import { POSCompletedBill, POSPaymentDetails } from '../../types/pos';
import { fetchPOSApi } from '../../lib/api';
import { 
  X, Banknote, QrCode, CreditCard, Layers, CheckCircle2, 
  Printer, ArrowRight, Loader2, Sparkles 
} from 'lucide-react';

interface PaymentModalProps {
  onClose: () => void;
  onCompleteBill: (bill: POSCompletedBill) => void;
}

const QUICK_CASH_DENOMS = [100, 200, 500, 1000, 2000];

export const PaymentModal: React.FC<PaymentModalProps> = ({ onClose, onCompleteBill }) => {
  const {
    items,
    discountAmount,
    couponCode,
    deliveryFee,
    orderSource,
    tableNumber,
    takeawayDetails,
    customerName,
    customerPhone,
    deliveryAddress,
    session,
    resetOrder,
  } = usePOSStore();

  const calcs = getPOSCalculations({ items, discountAmount, deliveryFee });
  
  const [method, setMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'SPLIT'>('CASH');
  const [cashReceived, setCashReceived] = useState<number>(calcs.finalTotal);
  const [splitCash, setSplitCash] = useState<number>(Math.floor(calcs.finalTotal / 2));
  const [cardRef, setCardRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cashChange = Math.max(0, cashReceived - calcs.finalTotal);
  const splitRemaining = Math.max(0, calcs.finalTotal - splitCash);

  const handleProcessPayment = async () => {
    setLoading(true);
    setError(null);

    const paymentDetails: POSPaymentDetails = {
      method,
      cashReceived: method === 'CASH' ? cashReceived : undefined,
      cashChange: method === 'CASH' ? cashChange : undefined,
      cardAmount: method === 'CARD' ? calcs.finalTotal : undefined,
      upiAmount: method === 'UPI' ? calcs.finalTotal : undefined,
      splitCash: method === 'SPLIT' ? splitCash : undefined,
      splitUPI: method === 'SPLIT' ? splitRemaining : undefined,
      transactionRef: cardRef || undefined,
    };

    const payload = {
      userId: 'pos_counter_walkin',
      orderSource,
      tableNumber: orderSource === 'POS_DINE_IN' ? tableNumber : undefined,
      takeawayDetails: orderSource === 'POS_TAKEAWAY' ? takeawayDetails : undefined,
      customerName: customerName || 'Walk-in Customer',
      contactPhone: customerPhone || '9999999999',
      deliveryAddress: orderSource === 'POS_DELIVERY' ? deliveryAddress : 'Restaurant Counter',
      items: items.map((it) => ({
        id: it.productId,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        size: it.size,
        crust: it.crust,
        addons: it.addons,
        instructions: it.kitchenNotes,
      })),
      discountAmount: calcs.discountAmount,
      couponCode: couponCode || undefined,
      deliveryFee: calcs.deliveryFee,
      paymentMethod: method,
      paymentDetails,
      session: {
        cashierName: session?.cashierName || 'Counter Cashier',
        terminalId: session?.terminalId || 'POS-TERM-01',
        branchId: session?.branchId || 'main_branch',
        branchName: session?.branchName || 'Olive Pizza — Rajnandgaon HQ',
        franchiseId: session?.franchiseId || 'fra_primary',
        organizationId: session?.organizationId || 'org_olive_pizza',
      },
    };

    try {
      const res = await fetchPOSApi('/api/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Order placement failed' }));
        throw new Error(errData.error || 'Failed to place order');
      }

      const resData = await res.json();
      const orderId = resData.orderId || ('ord_pos_' + Date.now());
      const billNumber = resData.dailyOrderNumber 
        ? \`#\${resData.dailyOrderNumber}\` 
        : (resData.orderNumber || orderId.slice(-6).toUpperCase());

      const completedBill: POSCompletedBill = {
        billNumber,
        orderId,
        orderSource,
        tableNumber: orderSource === 'POS_DINE_IN' ? tableNumber : undefined,
        takeawayDetails: orderSource === 'POS_TAKEAWAY' ? takeawayDetails : undefined,
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || '',
        deliveryAddress,
        items,
        subtotal: calcs.subtotal,
        discountAmount: calcs.discountAmount,
        couponCode,
        taxAmount: calcs.taxAmount,
        deliveryFee: calcs.deliveryFee,
        finalTotal: calcs.finalTotal,
        payment: paymentDetails,
        session: session || {
          cashierName: 'Counter Cashier',
          cashierUid: 'pos_uid',
          terminalId: 'POS-TERM-01',
          branchId: 'main_branch',
          branchName: 'Olive Pizza — Rajnandgaon HQ',
          franchiseId: 'fra_primary',
          organizationId: 'org_olive_pizza',
        },
        createdAt: new Date().toISOString(),
      };

      onCompleteBill(completedBill);
      resetOrder();
      onClose();
    } catch (err: any) {
      console.error('POS order settlement error:', err);
      setError(err.message || 'Failed to complete transaction on server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Settle Restaurant Bill</span>
              <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20 text-base">
                ₹{calcs.finalTotal}
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {orderSource.replace('POS_', '')} • {customerName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setMethod('CASH')}
                className={\`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 active:scale-95 \${
                  method === 'CASH'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold ring-1 ring-emerald-500/40'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }\`}
              >
                <Banknote className="w-5 h-5" />
                <span className="text-xs">Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('UPI')}
                className={\`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 active:scale-95 \${
                  method === 'UPI'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-400 font-bold ring-1 ring-amber-500/40'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }\`}
              >
                <QrCode className="w-5 h-5" />
                <span className="text-xs">UPI QR</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('CARD')}
                className={\`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 active:scale-95 \${
                  method === 'CARD'
                    ? 'bg-blue-500/15 border-blue-500 text-blue-400 font-bold ring-1 ring-blue-500/40'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }\`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs">Card / EDC</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('SPLIT')}
                className={\`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 active:scale-95 \${
                  method === 'SPLIT'
                    ? 'bg-purple-500/15 border-purple-500 text-purple-400 font-bold ring-1 ring-purple-500/40'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }\`}
              >
                <Layers className="w-5 h-5" />
                <span className="text-xs">Split Pay</span>
              </button>
            </div>
          </div>

          {/* Mode 1: CASH Settlement & Change Due Calculator */}
          {method === 'CASH' && (
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Cash Received from Customer:</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-zinc-500 text-base">₹</span>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-lg font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setCashReceived(calcs.finalTotal)}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-bold text-zinc-300 rounded-lg border border-zinc-700 transition"
                >
                  Exact (₹{calcs.finalTotal})
                </button>
                {QUICK_CASH_DENOMS.filter((d) => d >= calcs.finalTotal).map((den) => (
                  <button
                    key={den}
                    type="button"
                    onClick={() => setCashReceived(den)}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-bold text-zinc-300 rounded-lg border border-zinc-700 transition"
                  >
                    ₹{den}
                  </button>
                ))}
              </div>

              {/* Change Due Display */}
              <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400">Return Change to Customer:</span>
                <span className={\`text-xl font-mono font-black \${cashChange > 0 ? 'text-emerald-400' : 'text-zinc-500'}\`}>
                  ₹{cashChange}
                </span>
              </div>
            </div>
          )}

          {/* Mode 2: UPI QR Code Display */}
          {method === 'UPI' && (
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-center space-y-3">
              <div className="w-36 h-36 mx-auto bg-white p-2 rounded-xl shadow-inner flex items-center justify-center">
                <img
                  src={\`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=upi://pay?pa=olivepizza.rjn@okaxis&pn=OlivePizza&am=\${calcs.finalTotal}&cu=INR\`}
                  alt="UPI QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-xs text-zinc-400">
                Customer scans with <span className="text-amber-400 font-bold">GPay, PhonePe, Paytm</span>
              </div>
              <div className="font-mono text-xs text-zinc-500 bg-zinc-900 py-1.5 px-3 rounded-lg inline-block border border-zinc-800">
                UPI ID: olivepizza.rjn@okaxis
              </div>
            </div>
          )}

          {/* Mode 3: Card / EDC Machine Reference */}
          {method === 'CARD' && (
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
              <p className="text-xs text-zinc-400">
                Swipe/Tap card on EDC machine for <span className="font-bold text-white">₹{calcs.finalTotal}</span>.
              </p>
              <div>
                <label className="text-xs text-zinc-400 block mb-1 font-medium">Approval / Reference Code (Optional):</label>
                <input
                  type="text"
                  placeholder="e.g. EDC-TXN-89421"
                  value={cardRef}
                  onChange={(e) => setCardRef(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Mode 4: Split Payment (Cash + UPI/Card) */}
          {method === 'SPLIT' && (
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-medium">Cash Portion (₹):</label>
                  <input
                    type="number"
                    value={splitCash}
                    onChange={(e) => setSplitCash(Math.min(calcs.finalTotal, Math.max(0, Number(e.target.value) || 0)))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono font-bold text-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-medium">UPI / Card Portion (₹):</label>
                  <div className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono font-bold text-amber-400">
                    ₹{splitRemaining}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleProcessPayment}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Bill & Syncing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                <span>Complete Bill & Print (Enter)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
`;

// 5. components/pos/ThermalReceipt.tsx (include Takeaway details if present)
const thermalReceiptContent = `import React from 'react';
import { POSCompletedBill } from '../../types/pos';
import { Printer, X, CheckCircle2 } from 'lucide-react';

interface ThermalReceiptProps {
  bill: POSCompletedBill;
  onClose: () => void;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({ bill, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* Modal Top Bar (hidden on paper print) */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Bill Saved & Printable</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 80mm ESC/POS Thermal Receipt Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-zinc-950/60 print:bg-white print:p-0">
          <div className="max-w-[320px] mx-auto bg-white text-zinc-900 p-5 rounded-xl shadow-lg print:shadow-none print:max-w-none print:p-2 print:rounded-none font-mono text-xs leading-tight">
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-zinc-400 space-y-1">
              <h1 className="text-base font-black tracking-wider uppercase">OLIVE PIZZA</h1>
              <p className="text-[11px] font-semibold text-zinc-700">{bill.session.branchName}</p>
              <p className="text-[10px] text-zinc-600">GSTIN: 22AAFCO8899K1Z4</p>
              <p className="text-[10px] text-zinc-600">Ph: +91 98765 43210</p>
            </div>

            {/* Bill Meta */}
            <div className="py-2.5 border-b border-dashed border-zinc-400 space-y-1 text-[11px]">
              <div className="flex justify-between font-bold">
                <span>BILL: {bill.billNumber}</span>
                <span className="uppercase">{bill.orderSource.replace('POS_', '')}</span>
              </div>
              <div className="flex justify-between text-zinc-600 text-[10px]">
                <span>DATE: {new Date(bill.createdAt).toLocaleDateString('en-IN')}</span>
                <span>TIME: {new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {bill.tableNumber && (
                <div className="font-bold text-zinc-800">TABLE: {bill.tableNumber}</div>
              )}
              {bill.takeawayDetails && (
                <div className="text-zinc-800 text-[10px]">
                  <span>PICKUP: {bill.takeawayDetails.pickupEstimate} ({bill.takeawayDetails.pickupType})</span>
                  {bill.takeawayDetails.vehicleNumber && <div>VEHICLE: {bill.takeawayDetails.vehicleNumber}</div>}
                </div>
              )}
              <div className="text-zinc-700">
                CUSTOMER: {bill.customerName} {bill.customerPhone && \`(\${bill.customerPhone})\`}
              </div>
              <div className="text-zinc-600 text-[10px]">
                CASHIER: {bill.session.cashierName} • TERM: {bill.session.terminalId}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="py-2.5 border-b border-dashed border-zinc-400 space-y-2">
              <div className="flex justify-between font-bold text-[10px] border-b border-zinc-300 pb-1">
                <span>ITEM</span>
                <span>QTY</span>
                <span>PRICE</span>
              </div>

              {bill.items.map((it, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-medium">
                    <span className="truncate max-w-[180px]">{it.name}</span>
                    <span>x{it.quantity}</span>
                    <span className="font-bold">₹{(it.price + (it.addons || []).reduce((s, a) => s + a.price, 0)) * it.quantity}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 pl-1">
                    {it.size} • {it.crust}
                  </div>
                  {it.addons && it.addons.length > 0 && (
                    <div className="text-[9px] text-zinc-600 pl-1">
                      +{it.addons.map((a) => a.name).join(', ')}
                    </div>
                  )}
                  {it.kitchenNotes && (
                    <div className="text-[9px] italic text-zinc-500 pl-1">
                      *{it.kitchenNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="py-2.5 border-b border-dashed border-zinc-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>₹{bill.subtotal}</span>
              </div>
              {bill.discountAmount > 0 && (
                <div className="flex justify-between font-bold">
                  <span>DISCOUNT:</span>
                  <span>-₹{bill.discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>GST TAXES (5%):</span>
                <span>₹{bill.taxAmount}</span>
              </div>
              {bill.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>DELIVERY FEE:</span>
                  <span>₹{bill.deliveryFee}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm pt-1 border-t border-zinc-300">
                <span>TOTAL AMOUNT:</span>
                <span>₹{bill.finalTotal}</span>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="py-2 border-b border-dashed border-zinc-400 space-y-0.5 text-[10px] text-zinc-700">
              <div className="flex justify-between font-bold">
                <span>PAYMENT METHOD:</span>
                <span className="uppercase">{bill.payment.method}</span>
              </div>
              {bill.payment.cashReceived && (
                <>
                  <div className="flex justify-between">
                    <span>CASH RECEIVED:</span>
                    <span>₹{bill.payment.cashReceived}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>CHANGE RETURNED:</span>
                    <span>₹{bill.payment.cashChange || 0}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer Notice */}
            <div className="pt-3 text-center text-[10px] text-zinc-600 space-y-0.5">
              <p className="font-bold">THANK YOU FOR VISITING OLIVE PIZZA!</p>
              <p>For feedback: order@olivepizza.in</p>
              <p className="text-[8px] text-zinc-400">Order saved to Central Olive Pizza Cloud</p>
            </div>
          </div>
        </div>

        {/* Action Controls (hidden in print) */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Thermal Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
`;

// Write files to POS project
fs.writeFileSync(path.join(POS_DIR, 'src/types/pos.ts'), typesPosContent, 'utf8');
fs.writeFileSync(path.join(POS_DIR, 'src/store/posStore.ts'), posStoreContent, 'utf8');
fs.writeFileSync(path.join(POS_DIR, 'src/components/pos/CartPanel.tsx'), cartPanelContent, 'utf8');
fs.writeFileSync(path.join(POS_DIR, 'src/components/pos/PaymentModal.tsx'), paymentModalContent, 'utf8');
fs.writeFileSync(path.join(POS_DIR, 'src/components/pos/ThermalReceipt.tsx'), thermalReceiptContent, 'utf8');

console.log('✅ Takeaway Bottom Sheet / Drawer & Options added to POS successfully!');
