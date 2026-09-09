import React from 'react';
import { useNavigate, Link } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';
import { 
  Home, 
  UtensilsCrossed, 
  ArrowLeft, 
  Sparkles, 
  Flame, 
  Pizza, 
  Bot, 
  Gift 
} from 'lucide-react';
import SEO from '../components/SEO';
import PageTransition from '../components/PageTransition';

export interface NotFoundProps {
  title?: string;
  subtitle?: string;
  isProductNotFound?: boolean;
}

export default function NotFound({
  title = "Oops! This page got lost in the oven. 🍕",
  subtitle = "The page you're looking for doesn't exist, may have been moved, or is temporarily unavailable.",
  isProductNotFound = false,
}: NotFoundProps) {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  // Subtle floating motion animations respecting user's reduced motion preferences
  const floatAnimation = shouldReduceMotion
    ? undefined
    : {
        y: [-4, 6, -4],
        rotate: [-1, 1.5, -1],
        transition: {
          duration: 4.5,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        },
      };

  const glowAnimation = shouldReduceMotion
    ? undefined
    : {
        opacity: [0.35, 0.65, 0.35],
        scale: [0.98, 1.05, 0.98],
        transition: {
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        },
      };

  return (
    <>
      <SEO 
        title="Page Not Found (404) | Olive Pizza"
        description="The page you are looking for does not exist on Olive Pizza."
        noIndex={true}
      />

      <PageTransition className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden">
        {/* Background Ambient Warm Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 bg-secondary-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-primary-500/10 blur-[90px] rounded-full pointer-events-none" />

        <main className="w-full max-w-xl mx-auto flex flex-col items-center text-center relative z-10 py-6">
          
          {/* Visual Oven & Pizza Illustration */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative mb-6 flex items-center justify-center"
          >
            {/* Ambient Oven Hearth Glow */}
            <motion.div 
              animate={glowAnimation}
              className="absolute inset-0 -m-6 bg-gradient-to-t from-secondary-500/25 via-amber-500/15 to-transparent rounded-full blur-2xl pointer-events-none" 
            />

            {/* Pizza Oven Vector Art */}
            <motion.div 
              animate={floatAnimation}
              className="relative w-44 h-44 sm:w-52 sm:h-52 drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
            >
              <svg 
                viewBox="0 0 200 200" 
                className="w-full h-full"
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="Wood-fired pizza oven with warm embers"
              >
                {/* Oven Dome (Stone Bricks) */}
                <path 
                  d="M20 160 C20 70, 70 30, 100 30 C130 30, 180 70, 180 160 Z" 
                  fill="#1E1E1E" 
                  stroke="#354A3A" 
                  strokeWidth="4" 
                />
                <path 
                  d="M28 160 C28 80, 72 42, 100 42 C128 42, 172 80, 172 160 Z" 
                  fill="#151515" 
                />
                
                {/* Chimney */}
                <rect x="85" y="14" width="30" height="22" rx="4" fill="#2A2A2A" stroke="#354A3A" strokeWidth="3" />
                <path d="M80 14 L120 14" stroke="#55775A" strokeWidth="4" strokeLinecap="round" />

                {/* Oven Interior (Glowing Fire Cave) */}
                <path 
                  d="M50 160 C50 105, 75 90, 100 90 C125 90, 150 105, 150 160 Z" 
                  fill="url(#fireGlow)" 
                />

                {/* Fire Flames */}
                <path 
                  d="M75 160 C70 140, 85 130, 85 120 C90 135, 105 130, 100 160 Z" 
                  fill="#F97316" 
                  opacity="0.9"
                />
                <path 
                  d="M95 160 C90 142, 105 135, 105 125 C110 138, 120 136, 118 160 Z" 
                  fill="#F59E0B" 
                  opacity="0.95"
                />
                <circle cx="100" cy="148" r="8" fill="#FEF08A" opacity="0.8" />

                {/* Hearth Base Ledge */}
                <rect x="12" y="156" width="176" height="18" rx="6" fill="#2C3D31" stroke="#55775A" strokeWidth="3" />
                <rect x="16" y="160" width="168" height="10" rx="3" fill="#1E2822" />

                {/* Pizza Peel & Pizza Slice Peeking Out */}
                <g transform="translate(70, 115) rotate(-8)">
                  {/* Crust */}
                  <path d="M10 42 Q 35 24 60 42 L 35 5 Z" fill="#D97706" stroke="#92400E" strokeWidth="2" />
                  {/* Cheese */}
                  <path d="M14 40 Q 35 27 56 40 L 35 12 Z" fill="#FDE047" />
                  {/* Sauce swirl */}
                  <path d="M22 36 Q 35 30 48 36" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
                  {/* Pepperoni & Olives */}
                  <circle cx="30" cy="30" r="4.5" fill="#DC2626" />
                  <circle cx="42" cy="28" r="4" fill="#B91C1C" />
                  <circle cx="35" cy="20" r="3.5" fill="#131C17" stroke="#354A3A" strokeWidth="1.5" />
                  <circle cx="25" cy="22" r="2.5" fill="#15803D" />
                </g>

                {/* Fire Glow Gradient */}
                <defs>
                  <radialGradient id="fireGlow" cx="50%" cy="80%" r="60%">
                    <stop offset="0%" stopColor="#EA580C" />
                    <stop offset="50%" stopColor="#B45309" />
                    <stop offset="100%" stopColor="#1E1E1E" />
                  </radialGradient>
                </defs>
              </svg>

              {/* Floating garnish chips */}
              <motion.div 
                className="absolute -top-1 -right-2 text-2xl filter drop-shadow-md select-none"
                animate={shouldReduceMotion ? {} : { y: [-3, 3, -3], rotate: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                🌿
              </motion.div>
              <motion.div 
                className="absolute top-1/2 -left-4 text-xl filter drop-shadow-md select-none"
                animate={shouldReduceMotion ? {} : { y: [3, -3, 3], rotate: [0, -12, 0] }}
                transition={{ duration: 3.8, repeat: Infinity }}
              >
                🫒
              </motion.div>
              <motion.div 
                className="absolute -bottom-1 -left-2 text-xl filter drop-shadow-md select-none"
                animate={shouldReduceMotion ? {} : { y: [-2, 4, -2] }}
                transition={{ duration: 4.2, repeat: Infinity }}
              >
                🍅
              </motion.div>
            </motion.div>
          </motion.div>

          {/* 404 Status Pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md mb-4 shadow-sm"
          >
            <Flame className="w-4 h-4 text-secondary-500 animate-pulse" />
            <span className="text-xs font-black tracking-widest uppercase bg-gradient-to-r from-amber-400 via-secondary-400 to-primary-400 bg-clip-text text-transparent">
              Error 404 • Not Found
            </span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight mb-3 leading-snug px-2"
          >
            {title}
          </motion.h1>

          {/* Friendly Description */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="text-sm sm:text-base text-slate-300 dark:text-slate-400 max-w-md mx-auto mb-8 px-4 leading-relaxed"
          >
            {subtitle}
          </motion.p>

          {/* Direct Navigation Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 px-4 mb-10"
          >
            {/* Go Home Button */}
            <Link
              to="/"
              className="min-touch-target flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold text-sm sm:text-base shadow-[0_4px_20px_rgba(85,119,90,0.35)] active:scale-[0.98] transition-all"
            >
              <Home className="w-5 h-5" />
              <span>Go Home</span>
            </Link>

            {/* View Menu Button */}
            <Link
              to="/menu"
              className="min-touch-target flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-secondary-500/15 hover:bg-secondary-500/25 border border-secondary-500/40 text-secondary-400 font-bold text-sm sm:text-base hover:text-white active:scale-[0.98] transition-all"
            >
              <UtensilsCrossed className="w-5 h-5" />
              <span>View Menu</span>
            </Link>

            {/* Go Back Button */}
            <button
              onClick={handleGoBack}
              type="button"
              className="min-touch-target flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 font-medium text-sm sm:text-base hover:text-white active:scale-[0.98] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </button>
          </motion.div>

          {/* Helpful Quick Category Shortcuts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="w-full max-w-lg bg-dark-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-md text-left mx-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Hot from our wood-fired oven
              </h2>
            </div>

            <nav aria-label="Quick recommendations" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Link
                to="/menu"
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-slate-200 text-xs sm:text-sm font-semibold transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-primary-500/20 text-primary-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Pizza className="w-4 h-4" />
                </div>
                <span>Fresh Pizzas</span>
              </Link>

              <Link
                to="/menu"
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-slate-200 text-xs sm:text-sm font-semibold transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-secondary-500/20 text-secondary-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Gift className="w-4 h-4" />
                </div>
                <span>Value Combos</span>
              </Link>

              <Link
                to="/assistant"
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-slate-200 text-xs sm:text-sm font-semibold transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Bot className="w-4 h-4" />
                </div>
                <span>AI Assistant</span>
              </Link>
            </nav>
          </motion.div>

        </main>
      </PageTransition>
    </>
  );
}
