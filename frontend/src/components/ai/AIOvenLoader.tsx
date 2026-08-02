import React from 'react';
import { motion } from 'framer-motion';

export interface AIOvenLoaderProps {
  label?: string;
}

export const AIOvenLoader: React.FC<AIOvenLoaderProps> = ({ label = "Olive AI is baking your answer..." }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -10 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className="flex flex-col items-center justify-center p-4 bg-dark-900/90 border border-amber-500/20 rounded-3xl backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] my-2 max-w-xs mx-auto overflow-hidden relative"
    >
      {/* Background Warm Fire Ambient Lighting */}
      <motion.div
        animate={{
          opacity: [0.35, 0.7, 0.4, 0.85, 0.35],
          scale: [0.95, 1.1, 1, 1.15, 0.95],
        }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute inset-0 bg-gradient-radial from-amber-500/30 via-orange-600/15 to-transparent pointer-events-none blur-xl"
      />

      {/* SVG Stone Pizza Oven & Chimney Smoke Visualizer */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        
        {/* Animated Chimney Smoke Particles */}
        <div className="absolute top-0 left-[54px] w-6 h-10 pointer-events-none z-10">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, x: 0, scale: 0.4 }}
              animate={{
                opacity: [0, 0.7, 0.4, 0],
                y: [-2, -18, -32],
                x: [0, (i % 2 === 0 ? 5 : -5), (i % 2 === 0 ? 10 : -10)],
                scale: [0.4, 0.9, 1.4],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                delay: i * 0.7,
                ease: 'easeOut',
              }}
              className="absolute bottom-0 w-3 h-3 bg-amber-100/40 rounded-full blur-[2px]"
            />
          ))}
        </div>

        {/* ── Main SVG Stone Oven Visual ── */}
        <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_4px_16px_rgba(245,158,11,0.3)]">
          {/* Stone Oven Chassis / Dome */}
          <path
            d="M 20 90 A 40 40 0 0 1 100 90 L 100 100 L 20 100 Z"
            fill="#1e2430"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeOpacity="0.4"
          />

          {/* Chimney Pipe */}
          <rect x="52" y="18" width="16" height="22" rx="3" fill="#2a3242" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.3" />

          {/* Stone Oven Brick Lines */}
          <path d="M 35 70 Q 60 55 85 70" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.25" fill="none" />
          <path d="M 42 55 Q 60 45 78 55" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.2" fill="none" />

          {/* Oven Mouth Inner Cavity */}
          <path d="M 35 90 A 25 25 0 0 1 85 90 Z" fill="#0f131a" stroke="#d97706" strokeWidth="2" />

          {/* Inner Flickering Wood Fire Light */}
          <defs>
            <radialGradient id="ovenFireGlow" cx="50%" cy="80%" r="60%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
              <stop offset="40%" stopColor="#f97316" stopOpacity="0.9" />
              <stop offset="85%" stopColor="#dc2626" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#0f131a" stopOpacity="0" />
            </radialGradient>
          </defs>

          <motion.path
            d="M 36 90 A 24 24 0 0 1 84 90 Z"
            fill="url(#ovenFireGlow)"
            animate={{
              opacity: [0.6, 1, 0.7, 0.95, 0.6],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Dynamic Embers rising inside oven */}
          <motion.circle
            cx="50"
            cy="82"
            r="1.5"
            fill="#fef08a"
            animate={{ y: [-2, -12, -22], opacity: [1, 0.8, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.circle
            cx="70"
            cy="85"
            r="1.2"
            fill="#f97316"
            animate={{ y: [-1, -10, -18], opacity: [1, 0.7, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4, ease: 'easeOut' }}
          />

          {/* ── Animated Pizza on Wooden Peel ── */}
          <motion.g
            animate={{
              x: [0, 8, 2, 8, 0],
              y: [0, -2, 0, -2, 0],
            }}
            transition={{
              duration: 3.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {/* Wooden Peel Handle & Base */}
            <rect x="25" y="86" width="30" height="4" rx="2" fill="#b45309" />
            
            {/* Pizza Crust */}
            <circle cx="58" cy="87" r="9" fill="#d97706" stroke="#78350f" strokeWidth="1" />
            {/* Melted Cheese Layer */}
            <circle cx="58" cy="87" r="7" fill="#fef08a" />
            {/* Toppings (Olives, Bell Pepper, Paneer) */}
            <circle cx="56" cy="85" r="1.5" fill="#15803d" />
            <circle cx="61" cy="88" r="1.5" fill="#dc2626" />
            <rect x="57" y="88" width="2" height="2" fill="#ffffff" />
          </motion.g>

          {/* ── Interactive Oven Door Open / Close Peek Animation ── */}
          <motion.g
            animate={{
              rotateX: [0, -65, -5, -65, 0],
            }}
            transition={{
              duration: 3.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: '60px 90px' }}
          >
            {/* Metal Door Frame & Handle */}
            <path d="M 37 90 A 23 23 0 0 1 83 90 Z" fill="#2d3748" stroke="#f59e0b" strokeWidth="1.5" />
            <rect x="52" y="80" width="16" height="3" rx="1.5" fill="#f59e0b" />
          </motion.g>
        </svg>
      </div>

      {/* Label & Pulsing Baking Dots */}
      <div className="flex items-center gap-2 mt-1 z-10">
        <span className="text-xs font-bold bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200 bg-clip-text text-transparent tracking-wide">
          {label}
        </span>
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={dot}
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1, repeat: Infinity, delay: dot * 0.2 }}
              className="w-1.5 h-1.5 bg-amber-400 rounded-full inline-block"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};
