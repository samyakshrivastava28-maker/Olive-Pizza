import { useAuthStore } from "../../lib/store";
import { GlassCard } from "../../components/ui/glass/GlassSystem";
import { Star, Trophy, Award, TrendingUp, TrendingDown, Clock, CheckCircle2, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export default function DeliveryPerformance() {
  const { user } = useAuthStore();
  const metrics = user?.metrics || {
    totalDeliveries: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    totalTimeTaken: 0,
    fastestDelivery: 0,
    ratingSum: 0,
    ratingCount: 0,
  };

  const avgTime = metrics.successfulDeliveries > 0 ? Math.round(metrics.totalTimeTaken / metrics.successfulDeliveries) : 0;
  const successRate = metrics.totalDeliveries > 0 ? Math.round((metrics.successfulDeliveries / metrics.totalDeliveries) * 100) : 100;
  const avgRating = metrics.ratingCount > 0 ? (metrics.ratingSum / metrics.ratingCount).toFixed(1) : "5.0";

  // Tier calculation based on success rate and deliveries
  const getTier = () => {
    if (metrics.totalDeliveries < 10) return { name: "Rookie", color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20" };
    if (successRate >= 98 && metrics.totalDeliveries > 50) return { name: "Diamond", color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/20" };
    if (successRate >= 95) return { name: "Gold", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" };
    if (successRate >= 90) return { name: "Silver", color: "text-slate-300", bg: "bg-slate-300/10", border: "border-slate-300/20" };
    return { name: "Bronze", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" };
  };

  const tier = getTier();

  return (
    <div className="bg-dark-950 min-h-[100dvh] text-slate-200 pb-24 font-sans px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-white flex items-center gap-2"><Trophy className="text-yellow-500"/> Performance</h1>
          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${tier.bg} ${tier.color} ${tier.border} flex items-center gap-1`}>
            <Award size={14}/> {tier.name} Tier
          </div>
        </div>

        {/* Big Rating Card */}
        <GlassCard className="p-8 text-center relative overflow-hidden bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Star size={100} />
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 relative z-10">Customer Rating</p>
          <div className="text-6xl font-black text-yellow-400 relative z-10 flex items-center justify-center gap-2">
            {avgRating} <Star className="w-10 h-10 fill-current" />
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 relative z-10">
            <div className="bg-dark-900 px-4 py-1.5 rounded-full border border-dark-800 text-sm font-bold text-slate-300">
              Based on {metrics.ratingCount} reviews
            </div>
          </div>
        </GlassCard>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="p-4 flex flex-col gap-2 border border-dark-800">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400"><CheckCircle2 size={16}/></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Success Rate</p>
            <div className="flex items-end gap-2">
              <p className={`text-3xl font-black ${successRate >= 95 ? 'text-green-400' : successRate >= 85 ? 'text-yellow-400' : 'text-red-400'}`}>{successRate}%</p>
              {successRate >= 95 ? <TrendingUp className="text-green-400 mb-1" size={16}/> : <TrendingDown className="text-red-400 mb-1" size={16}/>}
            </div>
          </GlassCard>
          
          <GlassCard className="p-4 flex flex-col gap-2 border border-dark-800">
            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400"><Clock size={16}/></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Time</p>
            <p className="text-3xl font-black text-white">{avgTime}<span className="text-lg text-slate-500 ml-1">m</span></p>
          </GlassCard>
          
          <GlassCard className="p-4 flex flex-col gap-2 border border-dark-800">
            <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500"><TrendingUp size={16}/></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Deliveries</p>
            <p className="text-3xl font-black text-white">{metrics.totalDeliveries}</p>
          </GlassCard>
          
          <GlassCard className="p-4 flex flex-col gap-2 border border-dark-800">
            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400"><ShieldAlert size={16}/></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cancellations</p>
            <p className="text-3xl font-black text-white">{metrics.failedDeliveries}</p>
          </GlassCard>
        </div>

        {/* Achievements / Badges */}
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 mt-6">Recent Achievements</h3>
          <div className="space-y-3">
            <GlassCard className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white shadow-lg">
                <Star size={24} className="fill-current"/>
              </div>
              <div>
                <p className="font-bold text-white">5-Star Streak</p>
                <p className="text-sm text-slate-400">10 consecutive 5-star ratings</p>
              </div>
            </GlassCard>
            <GlassCard className="p-4 flex items-center gap-4 opacity-50 grayscale">
              <div className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center text-slate-500">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="font-bold text-white">Century Club</p>
                <p className="text-sm text-slate-400">Complete 100 deliveries</p>
              </div>
            </GlassCard>
          </div>
        </div>

      </div>
    </div>
  );
}
