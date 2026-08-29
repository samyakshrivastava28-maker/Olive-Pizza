import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Clock, Sparkles } from 'lucide-react';

export default function CountdownBanner({ config }: { config: any }) {
  const [timeLeft, setTimeLeft] = useState(9910); // ~2 hrs 45 mins countdown

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 9910));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (time: number) => {
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = time % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const bg = config.styleOverrides?.backgroundColor || '#EA580C';
  const textCol = config.styleOverrides?.textColor || '#FFFFFF';

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      className="w-full py-3.5 px-4 sm:px-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between shadow-xl gap-3 relative overflow-hidden"
      style={{
        backgroundColor: bg,
        color: textCol
      }}
    >
      {/* Shimmer Ambient Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none -translate-x-full animate-[shimmer_2.5s_infinite]" />

      <div className="flex items-center gap-3 relative z-10 text-center sm:text-left">
        <div className="w-8 h-8 rounded-xl bg-black/20 backdrop-blur-sm flex items-center justify-center shrink-0">
          <Flame className="w-4 h-4 text-yellow-300 animate-bounce" />
        </div>
        <div>
          <div className="text-xs sm:text-sm font-black tracking-tight leading-tight">
            {config.headline || '⚡ LIMITED TIME FLASH DEAL: 50% OFF On All Large Pizzas'}
          </div>
          {config.subtitle && (
            <div className="text-[11px] opacity-90 font-medium">
              {config.subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Countdown Timer Display */}
      <div className="flex items-center gap-2 relative z-10 bg-black/30 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20">
        <Clock className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-200">Ends In:</span>
        <span className="text-sm font-black font-mono tracking-widest text-white">
          {formatTime(timeLeft)}
        </span>
      </div>
    </motion.div>
  );
}
