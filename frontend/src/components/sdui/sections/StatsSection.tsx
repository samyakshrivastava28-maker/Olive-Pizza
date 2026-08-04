import React from 'react';
import { motion } from 'framer-motion';
import { Award, Flame, Users, Clock } from 'lucide-react';

interface StatsProps {
  config?: {
    stats?: Array<{ label: string; value: string; icon?: string }>;
  };
}

const DEFAULT_STATS = [
  { label: 'Pizzas Baked Hot', value: '50,000+', icon: Flame },
  { label: 'Happy Foodies', value: '12,500+', icon: Users },
  { label: 'Avg Delivery Time', value: '28 Mins', icon: Clock },
  { label: 'Customer Rating', value: '4.9 ★', icon: Award },
];

export const StatsSection: React.FC<StatsProps> = () => {
  return (
    <section className="py-10 px-4 max-w-7xl mx-auto relative z-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {DEFAULT_STATS.map((s, idx) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08 }}
              className="p-6 rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 text-center"
            >
              <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400">
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl md:text-3xl font-extrabold text-white">{s.value}</p>
              <p className="text-slate-400 text-xs mt-1 font-medium">{s.label}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
export default StatsSection;
