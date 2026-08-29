import fs from 'fs';
import path from 'path';

const POS_DIR = 'C:/Users/RYZEN/Downloads/olive-pizza-pos';

// 1. components/pos/POSHeader.tsx
const posHeaderContent = `import React, { useState, useEffect } from 'react';
import { usePOSStore } from '../../store/posStore';
import { LogOut, Receipt, Clock, MapPin, Monitor, User, ShieldCheck } from 'lucide-react';

interface POSHeaderProps {
  onLogout: () => void;
}

export const POSHeader: React.FC<POSHeaderProps> = ({ onLogout }) => {
  const { session, isHistoryOpen, setIsHistoryOpen } = usePOSStore();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-zinc-950 border-b border-zinc-800 px-4 flex items-center justify-between select-none">
      {/* Brand & Terminal Scope */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <span className="text-xl">🍕</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-wider text-white">OLIVE PIZZA</span>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                POS TERMINAL
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-zinc-500" />
                {session?.branchName || 'Rajnandgaon HQ'}
              </span>
              <span className="flex items-center gap-1 font-mono text-zinc-300">
                <Monitor className="w-3 h-3 text-zinc-500" />
                {session?.terminalId || 'POS-TERM-01'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center: Live Time & Status */}
      <div className="hidden md:flex items-center gap-4 bg-zinc-900/80 px-4 py-1.5 rounded-xl border border-zinc-800/80">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>{time.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
          <span className="text-zinc-600">•</span>
          <span className="font-bold text-amber-400">{time.toLocaleTimeString('en-IN')}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Online / Live Sync</span>
        </div>
      </div>

      {/* Right: Cashier & Quick Actions */}
      <div className="flex items-center gap-3">
        {/* Recent Bills History Button */}
        <button
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"
          title="Open Recent Bills (F8)"
        >
          <Receipt className="w-4 h-4 text-amber-400" />
          <span>Recent Bills</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] rounded border border-zinc-700 font-mono">
            F8
          </kbd>
        </button>

        {/* Cashier Badge */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
            <User className="w-4 h-4" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold text-zinc-200">{session?.cashierName || 'Counter Cashier'}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Active Shift</div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
          title="Sign out of terminal"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
`;

// 2. components/pos/CustomizationModal.tsx
const customizationModalContent = `import React, { useState } from 'react';
import { POSProduct, POSCartItemAddon } from '../../types/pos';
import { X, Plus, Minus, Check, Sparkles } from 'lucide-react';

interface CustomizationModalProps {
  product: POSProduct;
  onClose: () => void;
  onAdd: (item: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    size: string;
    crust: string;
    addons: POSCartItemAddon[];
    kitchenNotes?: string;
  }) => void;
}

const DEFAULT_SIZES = [
  { name: '8" Regular', price: 0 },
  { name: '10" Medium', price: 90 },
  { name: '12" Large', price: 180 },
];

const DEFAULT_CRUSTS = [
  { name: 'Classic Hand-Tossed', price: 0 },
  { name: 'Thin & Crispy', price: 40 },
  { name: 'Cheese Burst', price: 80 },
];

const DEFAULT_ADDONS: POSCartItemAddon[] = [
  { id: 'extra_cheese', name: 'Extra Mozzarella Cheese', price: 60 },
  { id: 'paneer', name: 'Fresh Paneer Cubes', price: 50 },
  { id: 'olives', name: 'Sliced Black Olives', price: 40 },
  { id: 'mushrooms', name: 'Grilled Mushrooms', price: 40 },
  { id: 'jalapenos', name: 'Pickled Jalapenos', price: 30 },
  { id: 'capsicum', name: 'Crispy Capsicum', price: 30 },
];

const QUICK_INSTRUCTION_CHIPS = [
  'No Onion',
  'No Capsicum',
  'Less Spicy',
  'Extra Spicy',
  'Extra Sauce',
  'Crispy Well-Done',
  'Cut into 6 Slices',
  'Cut into 8 Slices',
];

export const CustomizationModal: React.FC<CustomizationModalProps> = ({ product, onClose, onAdd }) => {
  const isPizza = product.category.toLowerCase().includes('pizza') || !product.category;
  
  const [selectedSize, setSelectedSize] = useState(DEFAULT_SIZES[1]); // Default 10" Medium
  const [selectedCrust, setSelectedCrust] = useState(DEFAULT_CRUSTS[0]);
  const [selectedAddons, setSelectedAddons] = useState<POSCartItemAddon[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [kitchenNotes, setKitchenNotes] = useState('');

  const toggleAddon = (addon: POSCartItemAddon) => {
    if (selectedAddons.some((a) => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter((a) => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const toggleChip = (chip: string) => {
    if (kitchenNotes.includes(chip)) {
      setKitchenNotes(kitchenNotes.replace(chip, '').replace(/,\\s*,/g, ',').replace(/^,\\s*|\\s*,$/g, '').trim());
    } else {
      setKitchenNotes(kitchenNotes ? \`\${kitchenNotes}, \${chip}\` : chip);
    }
  };

  const basePrice = product.price || product.basePrice || 229;
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const itemUnitPrice = isPizza
    ? basePrice + selectedSize.price + selectedCrust.price + addonsTotal
    : basePrice + addonsTotal;
  const itemFinalTotal = itemUnitPrice * quantity;

  const handleConfirm = () => {
    onAdd({
      productId: product.id,
      name: product.name,
      price: isPizza ? basePrice + selectedSize.price + selectedCrust.price : basePrice,
      quantity,
      size: isPizza ? selectedSize.name.split(' ')[0] : 'Standard',
      crust: isPizza ? selectedCrust.name : 'Standard',
      addons: selectedAddons,
      kitchenNotes: kitchenNotes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{product.name}</span>
              <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                Base ₹{basePrice}
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">Customize size, crust, toppings & kitchen notes</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Pizza Size */}
          {isPizza && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                1. Select Size
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {DEFAULT_SIZES.map((sz) => {
                  const isSelected = selectedSize.name === sz.name;
                  return (
                    <button
                      key={sz.name}
                      type="button"
                      onClick={() => setSelectedSize(sz)}
                      className={\`p-3 rounded-xl border text-left transition relative active:scale-95 \${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 text-white ring-1 ring-amber-500/40'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50'
                      }\`}
                    >
                      <div className="font-bold text-sm">{sz.name}</div>
                      <div className="text-xs text-amber-400 font-mono mt-1">
                        {sz.price > 0 ? \`+₹\${sz.price}\` : 'Included'}
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pizza Crust */}
          {isPizza && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                2. Select Crust
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {DEFAULT_CRUSTS.map((cr) => {
                  const isSelected = selectedCrust.name === cr.name;
                  return (
                    <button
                      key={cr.name}
                      type="button"
                      onClick={() => setSelectedCrust(cr)}
                      className={\`p-3 rounded-xl border text-left transition relative active:scale-95 \${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 text-white ring-1 ring-amber-500/40'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50'
                      }\`}
                    >
                      <div className="font-bold text-xs">{cr.name}</div>
                      <div className="text-xs text-amber-400 font-mono mt-1">
                        {cr.price > 0 ? \`+₹\${cr.price}\` : 'Included'}
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Extra Addons */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">
              {isPizza ? '3. Extra Toppings & Cheese' : 'Add-ons & Extras'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_ADDONS.map((ad) => {
                const isSelected = selectedAddons.some((a) => a.id === ad.id);
                return (
                  <button
                    key={ad.id}
                    type="button"
                    onClick={() => toggleAddon(ad)}
                    className={\`p-2.5 rounded-xl border text-left flex items-center justify-between transition active:scale-95 \${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 text-white ring-1 ring-emerald-500/40'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/40'
                    }\`}
                  >
                    <div>
                      <div className="text-xs font-medium text-zinc-200">{ad.name}</div>
                      <div className="text-[11px] text-emerald-400 font-mono font-bold">+₹{ad.price}</div>
                    </div>
                    <div className={\`w-4 h-4 rounded-md border flex items-center justify-center \${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-500 text-zinc-950'
                        : 'border-zinc-700 bg-zinc-900'
                    }\`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Kitchen Instructions */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">
              Special Kitchen Instructions
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {QUICK_INSTRUCTION_CHIPS.map((chip) => {
                const isSelected = kitchenNotes.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => toggleChip(chip)}
                    className={\`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition active:scale-95 \${
                      isSelected
                        ? 'bg-amber-500 text-zinc-950 border-amber-500 font-bold'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                    }\`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              placeholder="e.g. Less spicy, crispy base, extra oregano..."
              value={kitchenNotes}
              onChange={(e) => setKitchenNotes(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          {/* Quantity Controls */}
          <div className="flex items-center gap-3 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 flex items-center justify-center transition active:scale-90"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-bold text-base text-white w-6 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 flex items-center justify-center transition active:scale-90"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add to Bill Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-95"
          >
            <span>Add to Current Bill</span>
            <span className="font-mono text-base border-l border-zinc-950/20 pl-3">₹{itemFinalTotal}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
`;

// 3. components/pos/CartPanel.tsx
const cartPanelContent = `import React, { useState } from 'react';
import { usePOSStore, getPOSCalculations } from '../../store/posStore';
import { OrderSourceType } from '../../types/pos';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { 
  Trash2, Plus, Minus, CreditCard, Tag, UtensilsCrossed, ShoppingBag, 
  Bike, Phone, User, MapPin, Search, CheckCircle2, RotateCcw 
} from 'lucide-react';

interface CartPanelProps {
  onOpenPayment: () => void;
}

const TABLE_LIST = ['T-1', 'T-2', 'T-3', 'T-4', 'T-5', 'T-6', 'T-7', 'T-8', 'T-9', 'T-10', 'T-11', 'T-12'];

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
    customerName,
    customerPhone,
    deliveryAddress,
    deliveryFee,
    setDeliveryFee,
    setCustomer,
    discountAmount,
    setDiscountAmount,
    couponCode,
    setCouponCode,
    resetOrder,
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
    <aside className="w-96 bg-zinc-950 border-l border-zinc-800 flex flex-col h-full select-none">
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
            onClick={onOpenPayment}
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
  );
};
`;

// 4. components/pos/PaymentModal.tsx
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
      setError(err.response?.data?.error || err.message || 'Failed to complete transaction on server.');
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

// 5. components/pos/ProductGrid.tsx
const productGridContent = `import React, { useState } from 'react';
import { POSProduct } from '../../types/pos';
import { Search, Plus } from 'lucide-react';

interface ProductGridProps {
  products: POSProduct[];
  searchRef?: React.RefObject<HTMLInputElement | null>;
  onSelectProduct: (p: POSProduct) => void;
}

const CATEGORIES = [
  'All Items',
  'Veg Pizzas',
  'Non-Veg Pizzas',
  'Sides & Garlic Bread',
  'Beverages & Shakes',
  'Pastas & Desserts',
];

export const ProductGrid: React.FC<ProductGridProps> = ({ products, searchRef, onSelectProduct }) => {
  const [selectedCategory, setSelectedCategory] = useState('All Items');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products.filter((p) => {
    const matchesCat =
      selectedCategory === 'All Items' ||
      p.category?.toLowerCase().includes(selectedCategory.toLowerCase().slice(0, 4));
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-900 select-none overflow-hidden">
      {/* Search & Category Tabs */}
      <div className="p-3 border-b border-zinc-800 bg-zinc-950/80 space-y-2.5">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            ref={searchRef as any}
            type="text"
            placeholder="Search pizza, sides, drinks... (F2)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={\`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition active:scale-95 \${
                  isSelected
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-md'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800'
                }\`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Tiles Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
            <p className="text-sm font-semibold">No items match your search</p>
            <p className="text-xs text-zinc-600 mt-1">Try another category or clear search</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProduct(p)}
                className="bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 hover:border-amber-500/60 rounded-2xl p-3 text-left transition flex flex-col justify-between group active:scale-98 shadow-sm hover:shadow-lg"
              >
                <div>
                  {/* Image / Icon */}
                  <div className="w-full h-24 rounded-xl bg-zinc-900 border border-zinc-800/80 overflow-hidden mb-2.5 relative flex items-center justify-center">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-3xl">🍕</span>
                    )}
                    <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-amber-500 text-zinc-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow">
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>

                  <h3 className="font-bold text-xs text-zinc-200 group-hover:text-white line-clamp-1">
                    {p.name}
                  </h3>
                  <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                    {p.description || p.category}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                  <span className="font-mono font-black text-amber-400 text-sm">
                    ₹{p.price || p.basePrice || 229}
                  </span>
                  <span className="text-[10px] font-semibold text-zinc-500 group-hover:text-zinc-300">
                    Customize →
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
`;

// 6. components/pos/ThermalReceipt.tsx
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

// 7. pages/POSBillingScreen.tsx
const posBillingScreenContent = `import React, { useState, useEffect, useRef } from 'react';
import { POSHeader } from '../components/pos/POSHeader';
import { ProductGrid } from '../components/pos/ProductGrid';
import { CartPanel } from '../components/pos/CartPanel';
import { CustomizationModal } from '../components/pos/CustomizationModal';
import { PaymentModal } from '../components/pos/PaymentModal';
import { ThermalReceipt } from '../components/pos/ThermalReceipt';
import { BillHistoryDrawer } from '../components/pos/BillHistoryDrawer';
import { usePOSStore } from '../store/posStore';
import { POSProduct, POSCompletedBill } from '../types/pos';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface POSBillingScreenProps {
  onLogout: () => void;
}

const FALLBACK_PRODUCTS: POSProduct[] = [
  { id: 'prod_margherita', name: 'Classic Margherita', category: 'Veg Pizzas', price: 199, imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400', description: 'Fresh mozzarella & basil' },
  { id: 'prod_farmhouse', name: 'Farmhouse Delight', category: 'Veg Pizzas', price: 299, imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400', description: 'Capsicum, mushroom, tomato & onion' },
  { id: 'prod_paneer_tikka', name: 'Peppy Paneer Tikka', category: 'Veg Pizzas', price: 349, imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', description: 'Tandoori paneer with red paprika' },
  { id: 'prod_cheese_burst', name: 'Ultimate Cheese Burst', category: 'Veg Pizzas', price: 399, imageUrl: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=400', description: 'Molten cheese crust with golden corn' },
  { id: 'prod_chicken_fiesta', name: 'Chicken Golden Delight', category: 'Non-Veg Pizzas', price: 379, imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400', description: 'Barbeque chicken with extra cheese' },
  { id: 'prod_garlic_bread', name: 'Stuffed Garlic Bread', category: 'Sides & Garlic Bread', price: 149, imageUrl: 'https://images.unsplash.com/photo-1619881589880-e34927f8c92e?w=400', description: 'Garlic breadsticks with cheese dip' },
  { id: 'prod_coke', name: 'Coca-Cola (500ml)', category: 'Beverages & Shakes', price: 60, imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400', description: 'Chilled soft drink' },
  { id: 'prod_choco_lava', name: 'Choco Lava Cake', category: 'Pastas & Desserts', price: 109, imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400', description: 'Molten chocolate center cake' },
];

export const POSBillingScreen: React.FC<POSBillingScreenProps> = ({ onLogout }) => {
  const { 
    addItem, 
    lastCompletedBill, 
    setLastCompletedBill, 
    items, 
    resetOrder, 
    isHistoryOpen, 
    setIsHistoryOpen 
  } = usePOSStore();
  
  const [products, setProducts] = useState<POSProduct[]>(FALLBACK_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState<POSProduct | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Load live products from Firestore
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const prodSnap = await getDocs(collection(db, 'products'));
        if (!prodSnap.empty) {
          const loaded: POSProduct[] = prodSnap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name || 'Pizza',
              category: data.category || 'Veg Pizzas',
              price: data.price || 199,
              basePrice: data.basePrice || data.price || 199,
              imageUrl: data.image || data.imageUrl || '',
              description: data.description || '',
            };
          });
          setProducts(loaded);
        }
      } catch (err) {
        console.warn('Could not fetch Firestore products, using fallback catalog:', err);
      }
    };

    fetchCatalog();
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: Focus Search
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // F4: Clear / Reset Bill
      else if (e.key === 'F4') {
        e.preventDefault();
        resetOrder();
      }
      // F8: Toggle History Drawer
      else if (e.key === 'F8') {
        e.preventDefault();
        setIsHistoryOpen(!isHistoryOpen);
      }
      // F9 or Enter: Open Payment (when not typing in an input)
      else if ((e.key === 'F9' || (e.key === 'Enter' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName))) && items.length > 0 && !isPaymentOpen && !selectedProduct) {
        e.preventDefault();
        setIsPaymentOpen(true);
      }
      // Escape: Close modals
      else if (e.key === 'Escape') {
        if (selectedProduct) setSelectedProduct(null);
        if (isPaymentOpen) setIsPaymentOpen(false);
        if (lastCompletedBill) setLastCompletedBill(null);
        if (isHistoryOpen) setIsHistoryOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items.length, isPaymentOpen, selectedProduct, lastCompletedBill, isHistoryOpen]);

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-white overflow-hidden select-none font-sans">
      {/* 1. Terminal Header */}
      <POSHeader onLogout={onLogout} />

      {/* 2. Main Workspace: Product Grid (Left) + Current Bill Panel (Right) */}
      <div className="flex-1 flex overflow-hidden">
        <ProductGrid
          products={products}
          searchRef={searchInputRef}
          onSelectProduct={(p) => setSelectedProduct(p)}
        />
        <CartPanel onOpenPayment={() => setIsPaymentOpen(true)} />
      </div>

      {/* 3. Product Customization Modal */}
      {selectedProduct && (
        <CustomizationModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdd={(item) => addItem(item)}
        />
      )}

      {/* 4. Payment & Settlement Modal */}
      {isPaymentOpen && (
        <PaymentModal
          onClose={() => setIsPaymentOpen(false)}
          onCompleteBill={(bill) => setLastCompletedBill(bill)}
        />
      )}

      {/* 5. Thermal Receipt Print Modal */}
      {lastCompletedBill && (
        <ThermalReceipt
          bill={lastCompletedBill}
          onClose={() => setLastCompletedBill(null)}
        />
      )}

      {/* 6. Recent Bills Drawer */}
      <BillHistoryDrawer
        onReprint={(bill) => setLastCompletedBill(bill)}
      />
    </div>
  );
};
`;

// Write files to POS project
fs.writeFileSync(path.join(POS_DIR, 'src/components/pos/POSHeader.tsx'), posHeaderContent, 'utf8');
fs.writeFileSync(path.join(POS_DIR, 'src/components/pos/CustomizationModal.tsx'), customizationModalContent, 'utf8');
fs.writeFileSync(path.join(POS_DIR, 'src/components/pos/CartPanel.tsx'), cartPanelContent, 'utf8');
fs.writeFileSync(path.join(POS_DIR, 'src/components/pos/PaymentModal.tsx'), paymentModalContent, 'utf8');
fs.writeFileSync(path.join(POS_DIR, 'src/components/pos/ProductGrid.tsx'), productGridContent, 'utf8');
fs.writeFileSync(path.join(POS_DIR, 'src/components/pos/ThermalReceipt.tsx'), thermalReceiptContent, 'utf8');
fs.writeFileSync(path.join(POS_DIR, 'src/pages/POSBillingScreen.tsx'), posBillingScreenContent, 'utf8');

console.log('✅ All POS components updated successfully!');
