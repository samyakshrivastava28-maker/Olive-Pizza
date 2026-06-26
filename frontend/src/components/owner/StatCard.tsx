import { motion } from 'framer-motion';
import AnimatedCounter from '../ui/AnimatedCounter';
import { GlassCard } from '../ui/glass/GlassSystem';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: string;
  isPositive?: boolean;
  delay?: number;
  prefix?: string;
  colorTheme?: 'orange' | 'blue' | 'green' | 'purple' | 'gold' | 'red' | 'default';
}

export default function StatCard({ title, value, icon, trend, isPositive, delay = 0, prefix = '', colorTheme = 'default' }: StatCardProps) {
  
  // Try to parse the value as a number if it's a string, removing non-numeric characters except decimals
  const isNumeric = typeof value === 'number' || !isNaN(parseFloat(value.toString().replace(/[^0-9.-]+/g,"")));
  const numValue = isNumeric ? parseFloat(value.toString().replace(/[^0-9.-]+/g,"")) : 0;
  
  // Extract prefix if it's a string (like '₹')
  const actualPrefix = prefix || (typeof value === 'string' && value.startsWith('₹') ? '₹' : '');

  const themeColors = {
    orange: 'from-orange-500/20 to-[#1E293B] border-orange-500/30 text-orange-400',
    blue: 'from-blue-500/20 to-[#1E293B] border-blue-500/30 text-blue-400',
    green: 'from-green-500/20 to-[#1E293B] border-green-500/30 text-green-400',
    purple: 'from-purple-500/20 to-[#1E293B] border-purple-500/30 text-purple-400',
    gold: 'from-yellow-500/20 to-[#1E293B] border-yellow-500/30 text-yellow-400',
    red: 'from-red-500/20 to-[#1E293B] border-red-500/30 text-red-400',
    default: 'from-white/5 to-[#1E293B] border-white/10 text-slate-400'
  };

  const themeClass = themeColors[colorTheme] || themeColors.default;

  return (
    <GlassCard 
      className={`p-6 flex flex-col justify-between hover:shadow-xl transition-shadow cursor-default bg-gradient-to-br ${themeClass}`}
      hoverEffect={true}
    >
      <div className="flex justify-between items-start mb-4">
        <p className="text-sm font-bold text-white/80">{title}</p>
        <motion.span 
          whileHover={{ rotate: 15, scale: 1.2 }}
          className="text-2xl"
        >
          {icon}
        </motion.span>
      </div>
      <div>
        <h3 className="text-3xl font-black text-white flex items-center">
          {actualPrefix}
          {isNumeric ? <AnimatedCounter to={numValue} /> : value}
        </h3>
        {trend && (
          <p className={`text-sm mt-2 font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '↑' : '↓'} {trend}
          </p>
        )}
      </div>
    </GlassCard>
  );
}
