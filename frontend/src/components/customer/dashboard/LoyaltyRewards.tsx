import { motion } from "framer-motion";
import { Award, Sparkles, Gift, Check, ArrowRight, Star, Zap } from "lucide-react";
import { Link } from "react-router";
import { TiltCard } from "../../ui/TiltCard";
import { GlassButton } from "../../ui/glass/GlassSystem";

interface Props {
  stats: any;
}

export default function LoyaltyRewards({ stats }: Props) {
  const points = stats?.rewardPoints || 0;

  // Determine Tier & Next Tier Target
  let currentTier = "Bronze";
  let nextTier = "Silver";
  let targetPoints = 200;
  let progressPercent = Math.min(100, Math.round((points / 200) * 100));

  if (points >= 1000) {
    currentTier = "Platinum";
    nextTier = "Max Tier";
    targetPoints = 1000;
    progressPercent = 100;
  } else if (points >= 500) {
    currentTier = "Gold";
    nextTier = "Platinum";
    targetPoints = 1000;
    progressPercent = Math.min(100, Math.round(((points - 500) / 500) * 100));
  } else if (points >= 200) {
    currentTier = "Silver";
    nextTier = "Gold";
    targetPoints = 500;
    progressPercent = Math.min(100, Math.round(((points - 200) / 300) * 100));
  }

  const TIERS = [
    {
      name: "Bronze",
      range: "0 - 199 pts",
      perks: ["Earn 1 pt per ₹10 spent", "Birthday special slice", "Access to member-only drops"],
      accent: "from-amber-700/20 to-amber-950/40",
      border: "border-amber-700/30",
      tag: "Active Tier"
    },
    {
      name: "Silver",
      range: "200 - 499 pts",
      perks: ["1.25x point multiplier", "Free Garlic Bread on orders > ₹399", "Early access to seasonal specials"],
      accent: "from-slate-400/20 to-slate-900/40",
      border: "border-slate-400/30",
      tag: points >= 200 ? "Unlocked" : "Locked"
    },
    {
      name: "Gold",
      range: "500 - 999 pts",
      perks: ["1.5x point multiplier", "Free beverage on every large pizza", "Priority oven queue", "Special anniversary reward"],
      accent: "from-yellow-500/20 to-amber-950/40",
      border: "border-yellow-500/40",
      tag: points >= 500 ? "Unlocked" : "Locked"
    },
    {
      name: "Platinum",
      range: "1,000+ pts",
      perks: ["2x point multiplier", "Complimentary dessert every month", "Zero delivery fees on all orders", "VIP Chef Table preview"],
      accent: "from-emerald-500/20 to-teal-950/40",
      border: "border-emerald-500/40",
      tag: points >= 1000 ? "Unlocked" : "Locked"
    }
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-primary-500/10 to-dark-900/80 border border-amber-500/30 p-6 md:p-8 backdrop-blur-xl">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Award size={14} /> Olive Pizza Club
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              {currentTier} Member
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-md">
              Every bite gets rewarded. Earn points on every order and unlock culinary privileges.
            </p>
          </div>

          <div className="bg-dark-950/70 border border-white/10 rounded-2xl p-4 md:p-5 flex items-center gap-5 min-w-[220px]">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-dark-950 shadow-lg shadow-amber-500/25 flex-shrink-0">
              <Star size={28} className="fill-dark-950" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Available Points</p>
              <p className="text-3xl font-black text-white tracking-tight">{points}</p>
              <p className="text-xs text-amber-400 font-semibold mt-0.5">≈ ₹{Math.floor(points * 0.5)} redemption value</p>
            </div>
          </div>
        </div>

        {/* Tier Progress Bar */}
        {nextTier !== "Max Tier" && (
          <div className="relative z-10 mt-6 pt-6 border-t border-white/10">
            <div className="flex justify-between items-center text-xs font-bold text-slate-300 mb-2">
              <span>Current Tier: <strong className="text-white">{currentTier}</strong></span>
              <span>Next Tier: <strong className="text-amber-400">{nextTier}</strong> ({targetPoints - points} pts to go)</span>
            </div>
            <div className="w-full h-3 bg-dark-950/80 rounded-full overflow-hidden border border-white/10 p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tier Breakdown Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles size={20} className="text-amber-400" /> Membership Tiers
          </h3>
          <span className="text-xs text-slate-400">Automatic upgrades as you order</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map((t, idx) => {
            const isCurrent = t.name === currentTier;
            return (
              <div
                key={idx}
                className={`relative rounded-2xl p-5 border transition-all ${
                  isCurrent 
                    ? "bg-gradient-to-b from-amber-500/20 to-dark-900 border-amber-500/50 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30" 
                    : `bg-gradient-to-b ${t.accent} ${t.border} bg-dark-900/40`
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-amber-500 text-dark-950 text-[10px] font-black uppercase tracking-wider">
                    Current
                  </span>
                )}
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-black text-white">{t.name}</h4>
                  <span className="text-xs font-bold text-slate-400">{t.range}</span>
                </div>
                <div className="w-full h-px bg-white/10 my-3" />
                <ul className="space-y-2">
                  {t.perks.map((perk, pIdx) => (
                    <li key={pIdx} className="text-xs text-slate-300 flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ways to Earn & Redeem */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TiltCard className="p-6 bg-gradient-to-br from-primary-500/10 to-transparent">
          <div className="w-12 h-12 rounded-2xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400 mb-4">
            <Zap size={24} />
          </div>
          <h4 className="text-lg font-bold text-white mb-1">How to Earn Points</h4>
          <p className="text-sm text-slate-400 mb-4">
            Earn 1 point for every ₹10 spent on pizza, sides, and beverages across app, website, and in-restaurant dine-in.
          </p>
          <Link to="/menu">
            <GlassButton variant="primary" className="text-xs font-bold w-full justify-center">
              Order Now to Earn <ArrowRight size={14} className="ml-1" />
            </GlassButton>
          </Link>
        </TiltCard>

        <TiltCard className="p-6 bg-gradient-to-br from-emerald-500/10 to-transparent">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
            <Gift size={24} />
          </div>
          <h4 className="text-lg font-bold text-white mb-1">How to Redeem Points</h4>
          <p className="text-sm text-slate-400 mb-4">
            During checkout, toggle "Use Reward Points" to deduct your available points directly from your order total!
          </p>
          <Link to="/cart">
            <GlassButton variant="secondary" className="text-xs font-bold w-full justify-center">
              View Cart & Apply Points <ArrowRight size={14} className="ml-1" />
            </GlassButton>
          </Link>
        </TiltCard>
      </div>
    </div>
  );
}
