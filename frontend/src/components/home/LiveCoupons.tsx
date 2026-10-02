import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Ticket, Copy, Check, Clock, Sparkles, Flame } from "lucide-react";
import { useDataStore } from "../../lib/dataStore";
import { isItemActiveAndValid, getItemExpiryDate } from "../../lib/scheduling";
import toast from "react-hot-toast";

interface Coupon {
  id: string;
  code: string;
  type?: "percentage" | "fixed" | "tier" | "free_delivery";
  discountType?: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount?: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  maxDiscount?: number;
  startDate?: string;
  endDate?: string;
  expiryDate?: string;
  isActive?: boolean;
  isArchived?: boolean;
  description?: string;
}

export default function LiveCoupons() {
  const { coupons } = useDataStore();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Filter only valid, active, non-expired coupons
  const activeCoupons = useMemo(() => {
    if (!coupons || coupons.length === 0) return [];
    return coupons.filter((coupon: Coupon) => isItemActiveAndValid(coupon));
  }, [coupons]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Coupon "${code}" copied to clipboard!`, {
      icon: "🎉",
      style: {
        background: "#18181b",
        color: "#fff",
        border: "1px solid rgba(249, 115, 22, 0.4)",
      },
    });
    setTimeout(() => setCopiedCode(null), 3000);
  };

  // If no active coupons exist, hide entire section cleanly
  if (activeCoupons.length === 0) return null;

  return (
    <section className="relative py-14 sm:py-20 overflow-hidden z-10">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl h-80 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-14">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 border border-primary-200 backdrop-blur-md mb-3">
              <Flame className="w-4 h-4 text-primary-700 animate-bounce" />
              <span className="text-xs font-black uppercase tracking-wider text-primary-800">
                Exclusive Savings
              </span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Active <span className="bg-gradient-to-r from-primary-700 via-primary-600 to-amber-600 bg-clip-text text-transparent">Promo Coupons</span>
            </h2>
          </div>
          <p className="text-slate-600 text-sm sm:text-base max-w-md mt-2 md:mt-0 font-medium">
            Copy discount codes below and apply at checkout for instant cash discounts!
          </p>
        </div>

        {/* Coupons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeCoupons.map((coupon: Coupon, idx: number) => {
            const isCopied = copiedCode === coupon.code;
            const type = coupon.discountType || coupon.type || "percentage";
            const discountLabel =
              type === "percentage"
                ? `${coupon.discountValue}% OFF`
                : `₹${coupon.discountValue} OFF`;

            const minAmount = coupon.minOrderAmount || coupon.minOrderValue || 0;
            const expiryDate = getItemExpiryDate(coupon);

            return (
              <motion.div
                key={coupon.id || coupon.code}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.08 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="group relative rounded-3xl p-6 overflow-hidden border border-champagne/20 transition-all duration-300 flex flex-col justify-between shadow-[0_12px_35px_rgba(0,0,0,0.6)]"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(13, 20, 15, 0.95) 0%, rgba(7, 11, 8, 0.98) 100%)",
                }}
              >
                {/* Glowing Ribbon Header Badge */}
                <div className="absolute top-0 right-0">
                  <div className="bg-gradient-to-l from-primary-600 to-primary-700 text-champagne font-black text-[10px] uppercase tracking-widest px-4 py-1 rounded-bl-2xl shadow-md border-b border-l border-champagne/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-champagne animate-pulse" />
                    LIVE OFFER
                  </div>
                </div>

                {/* Left Ticket Cutout Decorative Dots */}
                <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 rounded-full bg-[#FAF8F5] border border-champagne/30" />
                <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full bg-[#FAF8F5] border border-champagne/30" />

                {/* Coupon Content */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary-950 border border-primary-500/30 text-champagne flex items-center justify-center shadow-inner">
                      <Ticket className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-2xl sm:text-3xl font-black text-champagne tracking-tight">
                        {discountLabel}
                      </span>
                      {minAmount > 0 && (
                        <p className="text-[11px] text-slate-400 font-semibold">
                          On orders above ₹{minAmount}
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-300 text-xs sm:text-sm font-medium mb-4 line-clamp-2">
                    {coupon.description || "Valid on all delicious handcrafted artisan pizzas and gourmet side orders."}
                  </p>

                  {/* Expiry Badge */}
                  {expiryDate && (
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 mb-5">
                      <Clock className="w-3.5 h-3.5 text-champagne" />
                      <span>Valid till {expiryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  )}
                </div>

                {/* Coupon Code Copy Button */}
                <div className="pt-4 border-t border-dashed border-white/15 flex items-center justify-between gap-3">
                  <div className="px-3.5 py-2 rounded-xl bg-black/60 border border-dark-700 font-mono text-sm sm:text-base font-black text-champagne tracking-wider flex-1 text-center">
                    {coupon.code}
                  </div>

                  <motion.button
                    onClick={() => handleCopyCode(coupon.code)}
                    whileTap={{ scale: 0.94 }}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md ${
                      isCopied
                        ? "bg-emerald-600 text-white shadow-emerald-500/30"
                        : "bg-primary-600 hover:bg-primary-500 text-champagne border border-champagne/30 shadow-primary-950/40"
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copy
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
