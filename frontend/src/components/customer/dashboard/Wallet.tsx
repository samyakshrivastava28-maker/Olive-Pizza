import { motion } from "framer-motion";
import { Wallet as WalletIcon, CreditCard, ArrowUpRight, ShieldCheck, Zap, Sparkles, Plus, History } from "lucide-react";
import { Link } from "react-router";
import { useAuthStore } from "../../../lib/store";
import { TiltCard } from "../../ui/TiltCard";
import { GlassButton } from "../../ui/glass/GlassSystem";

export default function Wallet() {
  const { user } = useAuthStore();
  const balance = 0; // Default wallet balance

  return (
    <div className="flex flex-col gap-8">
      {/* Header & Digital Pass */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spatial Virtual Pass Card */}
        <div className="lg:col-span-2">
          <div className="relative overflow-hidden rounded-3xl p-7 md:p-8 bg-gradient-to-br from-orange-600 via-amber-600 to-dark-950 text-white shadow-2xl shadow-orange-500/20 border border-white/20">
            {/* Background Texture & Glow */}
            <div className="absolute -right-16 -top-16 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute right-6 bottom-6 opacity-10 pointer-events-none text-9xl select-none font-black">
              🍕
            </div>

            <div className="relative z-10 flex justify-between items-start mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black tracking-widest uppercase bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm border border-white/20">
                    Olive Pizza Pass
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-300">
                    <ShieldCheck size={13} /> Secured
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight">Express Wallet</h3>
              </div>
              <div className="w-12 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center">
                <Zap size={20} className="text-amber-300" />
              </div>
            </div>

            <div className="relative z-10 mb-8">
              <p className="text-xs uppercase tracking-widest text-white/70 font-semibold mb-1">Current Balance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-black tracking-tight">₹{balance}.00</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-bold border border-emerald-500/30">
                  Instant Checkout Ready
                </span>
              </div>
            </div>

            <div className="relative z-10 flex flex-wrap justify-between items-end gap-4 pt-4 border-t border-white/15">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/60 font-bold">Card Holder</p>
                <p className="text-sm font-bold tracking-wide">{user?.name || user?.email?.split('@')[0] || "Pizza Club Member"}</p>
              </div>
              <div className="flex gap-2">
                <Link to="/menu">
                  <GlassButton variant="secondary" className="text-xs font-bold !bg-white/20 hover:!bg-white/30 text-white border-white/30">
                    Order with Wallet <ArrowUpRight size={14} className="ml-1" />
                  </GlassButton>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Benefits Card */}
        <TiltCard className="p-6 flex flex-col justify-between bg-dark-900/60">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
              <Sparkles size={24} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Zero Payment Failures</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Skip OTP waits and bank delays. Olive Pizza Wallet processes in under 400ms for rush hour lunch and late-night cravings.
            </p>
          </div>

          <div className="space-y-2 mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Instant refund directly to wallet on cancellations</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Stackable with coupons and reward coins</span>
            </div>
          </div>
        </TiltCard>
      </div>

      {/* Supported Payment Modes */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <CreditCard size={18} className="text-primary-400" /> Accepted Payment Channels
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { title: "UPI Direct", desc: "GPay, PhonePe, Paytm", icon: "⚡" },
            { title: "Cards", desc: "Visa, Mastercard, RuPay", icon: "💳" },
            { title: "Wallets", desc: "Amazon Pay, Mobikwik", icon: "👛" },
            { title: "Cash on Delivery", desc: "Available for all orders", icon: "💵" }
          ].map((mode, i) => (
            <div key={i} className="p-4 rounded-2xl bg-dark-900/40 border border-white/5 hover:border-white/15 transition-all">
              <span className="text-2xl mb-2 block">{mode.icon}</span>
              <h5 className="font-bold text-white text-sm">{mode.title}</h5>
              <p className="text-xs text-slate-400 mt-0.5">{mode.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
