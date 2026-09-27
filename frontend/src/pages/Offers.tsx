import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Copy, Check, Sparkles, Tag, ArrowRight, Flame, Percent, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useDataStore } from '../lib/dataStore';
import { useCartStore } from '../lib/store';
import PageTransition from '../components/PageTransition';
import SEO from '../components/SEO';
import toast from 'react-hot-toast';

interface CouponItem {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minOrder: number;
  maxDiscount?: number;
  validUntil?: string;
  badge?: string;
}

// Fallback verified active coupons if store has not loaded yet
const DEFAULT_COUPONS: CouponItem[] = [
  {
    id: 'c-best50',
    code: 'BEST50',
    title: 'Flat ₹50 OFF',
    description: 'Save ₹50 on all handcrafted pizzas & gourmet combos.',
    discountType: 'flat',
    discountValue: 50,
    minOrder: 349,
    validUntil: 'Limited Period',
    badge: 'Most Popular'
  },
  {
    id: 'c-olive100',
    code: 'OLIVE100',
    title: 'Flat ₹100 OFF',
    description: 'Special weekend feast discount on orders over ₹699.',
    discountType: 'flat',
    discountValue: 100,
    minOrder: 699,
    validUntil: 'All Orders',
    badge: 'Big Savings'
  },
  {
    id: 'c-pizzaparty',
    code: 'PIZZAPARTY',
    title: '20% OFF up to ₹150',
    description: 'Hosting friends or family? Enjoy 20% off on group cravings.',
    discountType: 'percentage',
    discountValue: 20,
    minOrder: 899,
    maxDiscount: 150,
    validUntil: 'Valid on 2+ Pizzas',
    badge: 'Party Deal'
  },
  {
    id: 'c-firstbite',
    code: 'FIRSTBITE',
    title: 'Flat ₹75 OFF on First Order',
    description: 'Welcome to Olive Pizza family! Enjoy ₹75 off your very first order.',
    discountType: 'flat',
    discountValue: 75,
    minOrder: 399,
    validUntil: 'New Customers',
    badge: 'Welcome Gift'
  }
];

export default function Offers() {
  const navigate = useNavigate();
  const { coupons: storeCoupons } = useDataStore();
  const { total } = useCartStore();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Combine store coupons with defaults
  const displayCoupons: CouponItem[] = React.useMemo(() => {
    if (storeCoupons && storeCoupons.length > 0) {
      return storeCoupons.map((c: any) => ({
        id: c.id,
        code: c.code,
        title: c.type === 'percentage' ? `${c.discountValue}% OFF` : `Flat ₹${c.discountValue} OFF`,
        description: c.description || `Get ${c.type === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`} off on your order.`,
        discountType: c.type || 'flat',
        discountValue: c.discountValue || 50,
        minOrder: c.minOrderAmount || c.minOrder || 299,
        maxDiscount: c.maxDiscount,
        badge: c.isFeatured ? 'Featured' : undefined
      }));
    }
    return DEFAULT_COUPONS;
  }, [storeCoupons]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Coupon code ${code} copied!`);
    setTimeout(() => {
      setCopiedCode(prev => prev === code ? null : prev);
    }, 2500);
  };

  const handleApplyCoupon = (coupon: CouponItem) => {
    // Apply coupon to cart via storage and event
    localStorage.setItem('olive_applied_coupon', coupon.code);
    window.dispatchEvent(new CustomEvent('coupon-applied', { detail: coupon.code }));
    toast.success(`Coupon ${coupon.code} applied to cart!`);
    navigate('/cart');
  };

  return (
    <PageTransition className="min-h-screen bg-[#FAF8F5] text-slate-900 pt-6 sm:pt-10 pb-28">
      <SEO title="Offers & Promo Codes | Olive Pizza" description="Save on artisan pizzas, sides & gourmet combos with verified Olive Pizza coupon codes." />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
        
        {/* ── 1. Champagne + Emerald Ink Flagship Hero ────────────────────────────── */}
        <div className="relative rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-[#064E3B] via-[#043d2e] to-[#01140e] text-white border border-champagne/30 shadow-lg shadow-primary-950/20 overflow-hidden">
          {/* Subtle decorative circles */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-champagne/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-champagne/20 border border-champagne/40 text-champagne text-xs font-black uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-champagne" />
              <span>Verified Olive Pizza Deals</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-serif font-black text-champagne tracking-tight leading-tight">
              Flavors You Love, Deals You Deserve
            </h1>
            <p className="text-xs sm:text-sm text-champagne/80 mt-2 leading-relaxed max-w-xl">
              Apply these exclusive promo codes directly at checkout for instant savings on stone-baked gourmet pizzas, handcrafted crusts, and combos.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <button
                onClick={() => navigate('/menu')}
                className="px-6 py-3 rounded-2xl bg-champagne hover:bg-champagne/90 text-primary-950 font-black text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Flame className="w-4 h-4 text-primary-950" />
                <span>Order Pizza Now</span>
              </button>
              <button
                onClick={() => navigate('/cart')}
                className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-champagne border border-champagne/30 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-champagne" />
                <span>View Cart ({total > 0 ? `₹${total}` : 'Empty'})</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 2. Offers & Coupons Grid ────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Ticket className="w-6 h-6 text-primary-600" />
                <span>Available Coupons</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Tap on any coupon to copy code or apply directly to your cart</p>
            </div>
            <span className="text-xs font-bold text-primary-700 bg-primary-50 px-3 py-1 rounded-full border border-primary-200">
              {displayCoupons.length} Active Deals
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {displayCoupons.map((coupon, idx) => {
              const isCopied = copiedCode === coupon.code;
              const canApplyDirectly = total >= coupon.minOrder;

              return (
                <motion.div
                  key={coupon.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-[#F8E7C9] shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between group"
                >
                  {/* Decorative Ticket Notch */}
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#FAF8F5] rounded-full border-r border-[#F8E7C9]" />
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#FAF8F5] rounded-full border-l border-[#F8E7C9]" />

                  <div>
                    {/* Top Row: Badge & Discount Title */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-lg sm:text-xl font-black text-primary-800 tracking-tight">
                        {coupon.title}
                      </span>
                      {coupon.badge && (
                        <span className="px-2.5 py-0.5 rounded-full bg-secondary-100 text-primary-800 text-[10px] font-black uppercase tracking-wider border border-secondary-300">
                          {coupon.badge}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      {coupon.description}
                    </p>

                    <div className="text-[11px] text-slate-500 font-medium space-y-1 mb-5">
                      <p className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                        <span>Minimum order value: <strong className="text-slate-900 font-bold">₹{coupon.minOrder}</strong></span>
                      </p>
                      {coupon.validUntil && (
                        <p className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Validity: <strong className="text-slate-800 font-semibold">{coupon.validUntil}</strong></span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Dashed Code Box & Action Buttons */}
                  <div className="pt-4 border-t border-dashed border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="px-3.5 py-1.5 rounded-xl bg-[#FAF8F5] border border-dashed border-primary-400 font-mono font-black text-xs sm:text-sm text-primary-900 tracking-wider">
                        {coupon.code}
                      </div>
                      <button
                        onClick={() => handleCopyCode(coupon.code)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Copy Code"
                      >
                        {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApplyCoupon(coupon)}
                        className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-xs ${
                          canApplyDirectly
                            ? 'bg-primary-600 hover:bg-primary-700 text-champagne'
                            : 'bg-primary-50 text-primary-800 hover:bg-primary-100 border border-primary-200'
                        }`}
                      >
                        <span>Apply</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── 3. Terms & Assurance Footer Card ─────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">How to redeem coupons?</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
              Select your favorite pizzas, add them to your cart, and enter the promo code in the "Apply Coupon" section during cart or checkout review. One coupon per order.
            </p>
          </div>
          <button
            onClick={() => navigate('/menu')}
            className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-champagne font-bold text-xs shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            Explore Menu
          </button>
        </div>

      </div>
    </PageTransition>
  );
}
