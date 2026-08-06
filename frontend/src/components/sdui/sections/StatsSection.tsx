import React from 'react';
import { SDUISection } from '../../../types/sdui.types';
import { Sparkles, Trophy, Award } from 'lucide-react';
import { motion } from 'framer-motion';

const defaultStats = [
  { label: 'Happy Pizza Foodies', value: '50,000+' },
  { label: 'Pizzas Oven-Baked', value: '120,000+' },
  { label: 'Avg Delivery Time', value: '20 mins' },
  { label: 'Google Rating', value: '4.9 ★' }
];

export const StatsSection: React.FC<{ section: SDUISection }> = ({ section }) => {
  const stats = section.config?.stats || defaultStats;

  return (
    <div className="w-full my-8 p-6 sm:p-8 rounded-[32px] bg-slate-950/80 border border-primary-500/30 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-black text-white tracking-tight">{section.label || 'Live Telemetry & Metrics'}</h3>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Stitch 3D Stats
            </span>
          </div>
          {section.subtitle && <p className="text-xs text-slate-300 mt-1">{section.subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
          <Trophy className="w-4 h-4 text-amber-400" /> #1 Voted Pizzeria
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s: any, i: number) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.05 }}
            className="p-6 text-center rounded-2xl bg-gradient-to-br from-primary-500/20 via-slate-900 to-amber-500/10 border border-primary-500/30 backdrop-blur-xl shadow-xl space-y-1"
          >
            <p className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-amber-300 to-yellow-400">
              {s.value}
            </p>
            <p className="text-xs font-black text-slate-200 uppercase tracking-wider">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
export default StatsSection;
