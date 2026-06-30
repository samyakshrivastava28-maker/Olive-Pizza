import { useState, useEffect } from "react";
import { useAuthStore } from "../../lib/store";
import { db } from "../../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { GlassCard } from "../../components/ui/glass/GlassSystem";
import { DollarSign, TrendingUp, Calendar, Clock, ArrowUpRight, CheckCircle2, ChevronRight, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function DeliveryEarnings() {
  const { user: authUser } = useAuthStore();
  const [liveUser, setLiveUser] = useState<any>(authUser);

  useEffect(() => {
    if (!authUser?.uid) return;
    const unsubscribe = onSnapshot(doc(db, "users", authUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setLiveUser((prev: any) => ({ ...(prev || authUser), ...docSnap.data() }));
      }
    });
    return () => unsubscribe();
  }, [authUser?.uid]);

  const earnings = liveUser?.earnings || { today: 0, thisWeek: 0, thisMonth: 0, total: 0, pendingPayout: 0 };
  const targetToday = 2000;
  const targetWeek = 12000;

  const todayProgress = Math.min((earnings.today / targetToday) * 100, 100);
  const weekProgress = Math.min((earnings.thisWeek / targetWeek) * 100, 100);

  return (
    <div className="bg-dark-950 min-h-[100dvh] text-slate-200 pb-24 font-sans px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-white flex items-center gap-2"><DollarSign className="text-green-500"/> Earnings</h1>
          <button className="text-sm font-bold text-primary-500 bg-primary-500/10 px-4 py-2 rounded-full border border-primary-500/20">Withdraw</button>
        </div>

        {/* Hero Balance */}
        <GlassCard className="p-8 text-center relative overflow-hidden bg-gradient-to-br from-green-500/10 to-blue-500/10">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp size={100} />
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 relative z-10">Total Balance</p>
          <h2 className="text-5xl font-black text-white relative z-10 flex items-center justify-center gap-1">
            <span className="text-green-500 text-3xl">₹</span>
            {earnings.total}
          </h2>
          <div className="mt-6 inline-flex items-center gap-2 bg-dark-900 px-4 py-2 rounded-full border border-dark-800 relative z-10">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-sm font-bold text-slate-300">Pending Payout: <span className="text-yellow-500">₹{earnings.pendingPayout}</span></span>
          </div>
        </GlassCard>

        {/* Progress Targets */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Activity size={16}/> Targets</h3>
          
          <GlassCard className="p-5">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Today's Goal</p>
                <p className="text-xl font-black text-white">₹{earnings.today} <span className="text-sm font-medium text-slate-500">/ ₹{targetToday}</span></p>
              </div>
              <p className="text-sm font-bold text-primary-500">{Math.round(todayProgress)}%</p>
            </div>
            <div className="w-full bg-dark-800 h-3 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${todayProgress}%` }} className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full" />
            </div>
            {todayProgress === 100 && <p className="text-xs text-green-400 font-bold mt-2 flex items-center gap-1"><CheckCircle2 size={12}/> Daily target reached!</p>}
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Weekly Goal</p>
                <p className="text-xl font-black text-white">₹{earnings.thisWeek} <span className="text-sm font-medium text-slate-500">/ ₹{targetWeek}</span></p>
              </div>
              <p className="text-sm font-bold text-blue-500">{Math.round(weekProgress)}%</p>
            </div>
            <div className="w-full bg-dark-800 h-3 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${weekProgress}%` }} className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" />
            </div>
          </GlassCard>
        </div>

        {/* Grid Stats */}
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="p-4 flex flex-col gap-2 border border-dark-800">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400"><Calendar size={16}/></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">This Month</p>
            <p className="text-2xl font-black text-white">₹{earnings.thisMonth}</p>
          </GlassCard>
          <GlassCard className="p-4 flex flex-col gap-2 border border-dark-800">
            <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400"><Clock size={16}/></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Online Time</p>
            <p className="text-2xl font-black text-white">4h 20m</p>
          </GlassCard>
        </div>

        {/* Recent Transactions List (Mocked) */}
        <div>
          <div className="flex justify-between items-center mb-4 mt-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Recent Transactions</h3>
            <button className="text-xs font-bold text-primary-500">View All</button>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <GlassCard key={i} className="p-4 flex items-center justify-between hover:bg-dark-800/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20">
                    <ArrowUpRight size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">Delivery Order</p>
                    <p className="text-xs text-slate-500 font-medium">Today, {12 + i}:30 PM</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-green-400">+₹{40 + (i * 10)}</p>
                  <p className="text-xs text-slate-500 font-bold flex items-center justify-end gap-1">Completed <ChevronRight size={12}/></p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
