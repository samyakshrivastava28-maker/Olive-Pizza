import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Ticket, Sparkles, Clock, Copy, Check, Percent } from "lucide-react";
import toast from "react-hot-toast";

interface Coupon {
  id: string;
  code: string;
  discount: string;
  title: string;
  subtitle: string;
  gradient: string;
  expiresInMinutes: number;
}

const FEATURED_OFFERS: Coupon[] = [
  {
    id: "offer-1",
    code: "OLIVE50",
    discount: "50% OFF",
    title: "Weekend Gourmet Feast",
    subtitle: "Applicable on all Artisan Pizzas above ₹499",
    gradient: "from-orange-600/30 via-red-600/20 to-amber-600/10",
    expiresInMinutes: 145,
  },
  {
    id: "offer-2",
    code: "FREESIDE",
    discount: "FREE SIDE",
    title: "Garlic Breadsticks Free",
    subtitle: "Get free Garlic Breadsticks on orders above ₹399",
    gradient: "from-emerald-600/30 via-teal-600/20 to-cyan-600/10",
    expiresInMinutes: 82,
  },
];

export default function PromotionalBanners() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Coupon '${code}' copied to clipboard! 🎟️`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <section className="relative py-12 md:py-16 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-8">
          <Ticket className="w-5 h-5 text-amber-400" />
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Exclusive <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Promotions & Offers</span>
          </h2>
        </div>

        {/* Offers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURED_OFFERS.map((offer, idx) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              whileHover={{ y: -5 }}
              className={`relative rounded-3xl p-6 sm:p-8 backdrop-blur-2xl border border-white/15 overflow-hidden bg-gradient-to-r ${offer.gradient}`}
              style={{
                boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              }}
            >
              {/* Floating Sparkles Decoration */}
              <div className="absolute top-3 right-4 opacity-40">
                <Sparkles className="w-8 h-8 text-amber-300 animate-pulse" />
              </div>

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider mb-3">
                    <Percent className="w-3.5 h-3.5" /> {offer.discount}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white mb-1">
                    {offer.title}
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm max-w-sm">
                    {offer.subtitle}
                  </p>

                  <div className="flex items-center gap-1.5 mt-3 text-xs text-amber-200/80 font-medium">
                    <Clock className="w-3.5 h-3.5" /> Limited time deal
                  </div>
                </div>

                {/* Coupon Code Pill */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 pt-4 sm:pt-0 border-t sm:border-t-0 border-white/10">
                  <div className="bg-black/50 border border-white/20 rounded-2xl px-4 py-2 text-center backdrop-blur-md">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">PROMO CODE</span>
                    <span className="text-lg font-black text-amber-300 tracking-wider font-mono">{offer.code}</span>
                  </div>

                  <button
                    onClick={() => handleCopy(offer.code)}
                    className="px-4 py-2.5 rounded-xl bg-white text-slate-950 font-bold text-xs hover:bg-amber-300 transition-all flex items-center gap-1.5 shadow-lg active:scale-95 whitespace-nowrap"
                  >
                    {copiedCode === offer.code ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-700" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Code
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
