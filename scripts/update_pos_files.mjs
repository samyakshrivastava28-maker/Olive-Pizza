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

export interface POSCompletedBill {
  billNumber: string;
  orderId: string;
  orderSource: OrderSourceType;
  tableNumber?: string;
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
import { POSCartItem, OrderSourceType, POSTerminalSession, POSCompletedBill } from '../types/pos';

interface POSState {
  // Session
  session: POSTerminalSession | null;
  setSession: (session: POSTerminalSession | null) => void;

  // Order Details
  orderSource: OrderSourceType;
  setOrderSource: (source: OrderSourceType) => void;
  tableNumber: string;
  setTableNumber: (table: string) => void;
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

  // Bill History Drawer
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

// 3. components/pos/BillHistoryDrawer.tsx
const billHistoryDrawerContent = `import React, { useState, useEffect } from 'react';
import { usePOSStore } from '../../store/posStore';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { X, Search, Printer, Calendar, Clock, Receipt, RefreshCw, CheckCircle2, User, Phone } from 'lucide-react';
import { POSCompletedBill } from '../../types/pos';

interface BillHistoryDrawerProps {
  onReprint: (bill: POSCompletedBill) => void;
}

export const BillHistoryDrawer: React.FC<BillHistoryDrawerProps> = ({ onReprint }) => {
  const { isHistoryOpen, setIsHistoryOpen, session } = usePOSStore();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBill, setSelectedBill] = useState<any | null>(null);

  const fetchRecentBills = async () => {
    setLoading(true);
    try {
      const ordersRef = collection(db, 'orders');
      // Fetch recent 40 orders
      const q = query(ordersRef, orderBy('createdAt', 'desc'), limit(40));
      const snap = await getDocs(q);

      const fetched = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          formattedDate: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
          formattedTime: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        };
      });

      setBills(fetched);
    } catch (err) {
      console.error('Failed to fetch bill history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHistoryOpen) {
      fetchRecentBills();
    }
  }, [isHistoryOpen]);

  if (!isHistoryOpen) return null;

  const filteredBills = bills.filter(b => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const orderNum = (b.daily_order_number || b.dailyOrderNumber || b.id || '').toString().toLowerCase();
    const customer = (b.customerName || '').toLowerCase();
    const phone = (b.contactPhone || b.phone || '').toLowerCase();
    const orderType = (b.orderSource || b.deliveryType || '').toLowerCase();
    return orderNum.includes(q) || customer.includes(q) || phone.includes(q) || orderType.includes(q);
  });

  const handlePrintBill = (b: any) => {
    const billObj: POSCompletedBill = {
      billNumber: b.daily_order_number || (b.dailyOrderNumber ? \`#\${b.dailyOrderNumber}\` : b.id.slice(-6).toUpperCase()),
      orderId: b.id,
      orderSource: b.orderSource || 'POS_DINE_IN',
      tableNumber: b.tableNumber,
      customerName: b.customerName || 'Walk-in Customer',
      customerPhone: b.contactPhone || b.phone || '',
      deliveryAddress: b.deliveryAddress?.addressLine || '',
      items: Array.isArray(b.items) ? b.items.map((it: any) => ({
        cartItemId: it.id || it.productId || Math.random().toString(),
        productId: it.id || it.productId || '',
        name: it.name || it.productName || 'Item',
        price: it.price || 0,
        quantity: it.quantity || 1,
        size: it.size || 'Regular',
        crust: it.crust || 'Classic Hand-Tossed',
        addons: it.addons || [],
        kitchenNotes: it.kitchenNotes || it.instructions || '',
      })) : [],
      subtotal: b.subtotal || b.totalAmount || 0,
      discountAmount: b.discountAmount || 0,
      couponCode: b.appliedCouponCode,
      taxAmount: b.taxes || Math.round((b.totalAmount || 0) * 0.05),
      deliveryFee: b.deliveryFee || 0,
      finalTotal: b.totalAmount || 0,
      payment: {
        method: (b.paymentMethod || 'CASH').toUpperCase() as any,
        transactionRef: b.paymentId,
      },
      session: {
        cashierName: b.cashierName || session?.cashierName || 'Counter Cashier',
        cashierUid: session?.cashierUid || 'cashier_uid',
        terminalId: b.terminalId || session?.terminalId || 'POS-TERM-01',
        branchId: b.branchId || session?.branchId || 'main_branch',
        branchName: b.branchName || session?.branchName || 'Olive Pizza — Rajnandgaon HQ',
        franchiseId: b.franchiseId || session?.franchiseId || 'fra_primary',
        organizationId: b.organizationId || session?.organizationId || 'org_olive_pizza',
      },
      createdAt: b.createdAt?.toDate ? b.createdAt.toDate().toISOString() : new Date().toISOString(),
    };

    onReprint(billObj);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-zinc-900 border-l border-zinc-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">POS Billing History</h2>
              <p className="text-xs text-zinc-400">Recent manual restaurant bills & thermal reprints</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchRecentBills}
              disabled={loading}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition"
              title="Refresh Bills"
            >
              <RefreshCw className={\`w-4 h-4 \${loading ? 'animate-spin text-amber-400' : ''}\`} />
            </button>
            <button
              onClick={() => setIsHistoryOpen(false)}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/80">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Bill #, Customer Name, Phone, or Type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>
        </div>

        {/* Bills List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
              <RefreshCw className="w-6 h-6 animate-spin mb-2 text-amber-400" />
              <p className="text-sm">Loading recent bills from database...</p>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-base font-medium text-zinc-400">No bills found</p>
              <p className="text-xs text-zinc-600 mt-1">Try a different search query or place a new bill</p>
            </div>
          ) : (
            filteredBills.map((b) => {
              const isSelected = selectedBill?.id === b.id;
              const billNo = b.daily_order_number || (b.dailyOrderNumber ? \`#\${b.dailyOrderNumber}\` : b.id.slice(-6).toUpperCase());
              const isPOS = (b.orderSource || '').startsWith('POS_') || b.orderSource === 'OFFLINE_RESTAURANT';

              return (
                <div
                  key={b.id}
                  className={\`p-4 rounded-xl border transition cursor-pointer \${
                    isSelected
                      ? 'bg-zinc-800/90 border-amber-500/50 shadow-lg ring-1 ring-amber-500/30'
                      : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40'
                  }\`}
                  onClick={() => setSelectedBill(isSelected ? null : b)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400 text-base">{billNo}</span>
                        <span className={\`text-[11px] font-semibold px-2 py-0.5 rounded-md uppercase \${
                          b.orderSource === 'POS_DINE_IN'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : b.orderSource === 'POS_DELIVERY'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }\`}>
                          {b.orderSource?.replace('POS_', '') || b.deliveryType || 'TAKEAWAY'}
                        </span>
                        {b.tableNumber && (
                          <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700 font-medium">
                            {b.tableNumber}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-zinc-500" />
                          {b.customerName || 'Walk-in'}
                        </span>
                        {(b.contactPhone || b.phone) && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-zinc-500" />
                            {b.contactPhone || b.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold text-emerald-400 font-mono">
                        ₹{b.totalAmount || 0}
                      </div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-1 justify-end mt-1">
                        <Clock className="w-3 h-3" />
                        {b.formattedTime}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Item Details */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2 animate-in fade-in duration-150">
                      <div className="text-xs font-semibold text-zinc-300 mb-1">Billed Items:</div>
                      <div className="space-y-1 bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                        {Array.isArray(b.items) && b.items.map((it: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs text-zinc-300">
                            <span>
                              {it.quantity || 1}x {it.name || it.productName}{' '}
                              <span className="text-zinc-500 text-[11px]">({it.size || 'Reg'}, {it.crust || 'Hand-Tossed'})</span>
                            </span>
                            <span className="font-mono text-zinc-400">₹{(it.price || 0) * (it.quantity || 1)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="text-[11px] text-zinc-400">
                          Payment: <span className="font-bold text-zinc-200">{b.paymentMethod || 'CASH'}</span>
                          {b.cashierName && <span> • Cashier: {b.cashierName}</span>}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintBill(b);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs transition active:scale-95 shadow-md"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Reprint Receipt
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500">
          <span>Showing latest {filteredBills.length} records</span>
          <span className="font-mono">{session?.branchName || 'Olive Pizza'}</span>
        </div>
      </div>
    </div>
  );
};
`;

// Write files to POS project
fs.writeFileSync(path.join(POS_DIR, 'src/types/pos.ts'), typesPosContent, 'utf8');
fs.writeFileSync(path.join(POS_DIR, 'src/store/posStore.ts'), posStoreContent, 'utf8');
fs.writeFileSync(path.join(POS_DIR, 'src/components/pos/BillHistoryDrawer.tsx'), billHistoryDrawerContent, 'utf8');

console.log('✅ types/pos.ts, store/posStore.ts, and BillHistoryDrawer.tsx written successfully!');
