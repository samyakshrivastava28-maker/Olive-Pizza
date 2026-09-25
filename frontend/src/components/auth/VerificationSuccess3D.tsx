import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Sparkles, ArrowRight, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

export interface VerificationSuccess3DProps {
  identifier?: string;
  method?: 'email' | 'phone' | 'truecaller' | 'google';
  title?: string;
  subtitle?: string;
  onContinue: () => void;
  autoRedirectMs?: number;
}

export default function VerificationSuccess3D({
  identifier,
  method = 'email',
  title = 'Identity Verified!',
  subtitle,
  onContinue,
  autoRedirectMs = 1500,
}: VerificationSuccess3DProps) {
  const [progress, setProgress] = useState(0);

  // Trigger high-end celebration confetti burst on mount
  useEffect(() => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10b981', '#059669', '#34d399', '#f59e0b', '#ffffff'],
        disableForReducedMotion: true,
      });
    } catch {}

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / autoRedirectMs) * 100);
      setProgress(pct);
      if (elapsed >= autoRedirectMs) {
        clearInterval(interval);
        onContinue();
      }
    }, 20);

    return () => clearInterval(interval);
  }, [autoRedirectMs, onContinue]);

  const methodLabel =
    method === 'truecaller'
      ? 'Truecaller 1-Tap'
      : method === 'phone'
      ? 'SMS Phone OTP'
      : method === 'google'
      ? 'Google Secure'
      : 'Email 4-Digit OTP';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative w-full max-w-md mx-auto p-6 md:p-8 flex flex-col items-center justify-center text-center overflow-hidden select-none"
      style={{ perspective: 1200 }}
    >
      {/* Radiant Background Glows */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: [1, 1.25, 1.1], opacity: [0.35, 0.65, 0.45] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-72 h-72 rounded-full bg-emerald-500/20 blur-3xl"
        />
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.25] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          className="w-60 h-60 rounded-full bg-amber-400/15 blur-2xl -translate-y-4"
        />
      </div>

      {/* 3D Tactile Verified Badge Core */}
      <motion.div
        initial={{ rotateX: 35, rotateY: -20, scale: 0.6, y: 30, opacity: 0 }}
        animate={{ rotateX: 0, rotateY: 0, scale: 1, y: 0, opacity: 1 }}
        transition={{
          type: 'spring',
          damping: 14,
          stiffness: 160,
          mass: 0.8,
        }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative w-36 h-36 md:w-40 md:h-40 flex items-center justify-center mb-6 cursor-default"
      >
        {/* Layer 0: Depth Shadow Plate */}
        <div
          className="absolute inset-2 rounded-3xl bg-emerald-950/20 blur-xl"
          style={{ transform: 'translateZ(-30px)' }}
        />

        {/* Layer 1: Ambient Orbiting Rings */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border border-dashed border-emerald-500/30"
          style={{ transform: 'translateZ(10px)' }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-2 rounded-full border border-emerald-400/20"
          style={{ transform: 'translateZ(15px)' }}
        />

        {/* Layer 2: Glossy Geometric Shield Base */}
        <div
          className="relative w-28 h-28 md:w-32 md:h-32 rounded-3xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-700 p-[2px] shadow-2xl shadow-emerald-500/40"
          style={{ transform: 'translateZ(25px)' }}
        >
          {/* Glassmorphic Inner Facet */}
          <div className="w-full h-full rounded-[22px] bg-gradient-to-b from-stone-900/90 via-stone-950/95 to-stone-900/90 backdrop-blur-xl flex items-center justify-center relative overflow-hidden border border-white/10">
            {/* Gloss reflection sweep */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none transform -rotate-45 translate-x-[-100%] animate-[shimmer_2s_infinite]" />

            {/* Glowing Center Ring */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 18 }}
              className="w-16 h-16 md:w-18 md:h-18 rounded-2xl bg-gradient-to-tr from-emerald-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/50"
              style={{ transform: 'translateZ(35px)' }}
            >
              {/* Dynamic SVG Checkmark Animation */}
              <svg
                className="w-9 h-9 md:w-10 md:h-10 text-white drop-shadow-md"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <motion.path
                  d="M5 13l4 4L19 7"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: 0.45,
                    ease: [0.65, 0, 0.35, 1],
                    delay: 0.25,
                  }}
                />
              </svg>
            </motion.div>
          </div>
        </div>

        {/* Layer 3: Floating 3D Orbital Particles */}
        <motion.div
          animate={{ y: [-4, 4, -4], x: [2, -2, 2] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 shadow-md shadow-amber-500/60 border border-white/60 flex items-center justify-center"
          style={{ transform: 'translateZ(45px)' }}
        >
          <Sparkles className="w-3.5 h-3.5 text-stone-900" />
        </motion.div>
        <motion.div
          animate={{ y: [4, -4, 4], x: [-2, 2, -2] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-emerald-300 shadow-md shadow-emerald-400/50 border border-white/60"
          style={{ transform: 'translateZ(40px)' }}
        />
      </motion.div>

      {/* Pill Badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-2"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>{methodLabel} Verified</span>
      </motion.div>

      {/* Heading & Subtitle */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1"
      >
        {title}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-xs md:text-sm text-slate-600 dark:text-stone-300 font-medium max-w-xs mb-4"
      >
        {subtitle || (
          <>
            Welcome to Olive Pizza. You are securely signed in as{' '}
            <span className="font-bold text-slate-900 dark:text-white">
              {identifier || 'Loyal Foodie'}
            </span>
            .
          </>
        )}
      </motion.p>

      {/* Auto-redirect progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="w-full max-w-xs bg-slate-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden mb-5"
      >
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-400 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </motion.div>

      {/* Direct Continue Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        onClick={onContinue}
        className="w-full max-w-xs py-3.5 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
      >
        <span>Continue to Olive Pizza</span>
        <ArrowRight className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
}
