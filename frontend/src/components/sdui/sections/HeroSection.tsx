import React from 'react';
import { SDUISection } from '../../../types/sdui.types';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, ShoppingBag, Flame, Star, Clock, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router';

export const HeroSection: React.FC<{ section: SDUISection }> = ({ section }) => {
  const navigate = useNavigate();
  const title = section.label || section.config?.title || 'Artisanal Wood-Fired Pizza Feast';
  const subtitle = section.subtitle || section.config?.subtitle || 'Handcrafted dough fermented for 72 hours, rich Italian San Marzano tomatoes, and melted fresh mozzarella delivered hot to your door.';
  const ctaText = section.config?.ctaText || 'Order Hot Pizza Now';
  const badgeText = section.config?.badge || '🔥 #1 Rated Wood-Fired Pizza';
  const isStitchDesign = section.config?.stitchDesign || true;
  const bgType = section.style?.bgType || 'gradient';
  const bgGradient = section.style?.bgGradient || 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(85,119,90,0.15), rgba(6,7,10,0.95))';

  return (
    <div
      className={`w-full py-12 px-6 sm:px-10 rounded-[32px] relative overflow-hidden my-6 border border-primary-500/30 shadow-2xl backdrop-blur-2xl transition-all ${
        bgType === 'glass' ? 'bg-slate-950/80 border-primary-500/40 shadow-primary-500/10' : ''
      }`}
      style={{
        background: bgType === 'gradient' ? bgGradient : section.style?.bgColor || '#06070a',
      }}
    >
      {/* Google Stitch Ambient Animated Glow Orbs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary-500/25 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-green-500/25 blur-[120px] pointer-events-none animate-pulse" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Text & Controls (Column 1-7) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Header Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-500/20 border border-primary-500/40 text-primary-300 text-xs font-black uppercase tracking-wider shadow-lg shadow-primary-500/10"
            >
              <Flame className="w-4 h-4 text-primary-400 animate-bounce" />
              <span>{badgeText}</span>
            </motion.div>

            {isStitchDesign && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[11px] font-bold">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Google Stitch 3D UI
              </span>
            )}
          </div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent"
          >
            {title}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed font-medium"
          >
            {subtitle}
          </motion.p>

          {/* Key Metrics / Highlights Bar */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-300 font-bold"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>20 Min Hot Delivery</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span>4.9/5 (15k+ Reviews)</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              <span>100% Organic Ingredients</span>
            </div>
          </motion.div>

          {/* Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center gap-3 pt-3"
          >
            <button
              onClick={() => navigate('/menu')}
              className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-primary-500 via-orange-500 to-amber-500 hover:from-primary-600 hover:to-orange-600 font-black text-sm text-white shadow-xl shadow-primary-500/30 transition-all hover:scale-105 active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{ctaText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate('/offers')}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-white/15 font-bold text-xs text-white transition-all hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>View Active Promo Deals</span>
            </button>
          </motion.div>
        </div>

        {/* Right 3D Visual Showcase (Column 8-12) */}
        <div className="lg:col-span-5 relative flex justify-center items-center">
          {/* Animated 3D Floating Card Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="w-full max-w-sm p-6 rounded-3xl bg-slate-950/90 border border-primary-500/30 shadow-2xl shadow-primary-500/20 backdrop-blur-xl relative space-y-4 group hover:border-primary-500/60 transition-all"
          >
            {/* Top Floating Badge */}
            <div className="absolute -top-3 -right-3 px-3 py-1 rounded-full bg-gradient-to-r from-primary-500 to-amber-500 text-white font-black text-[10px] uppercase tracking-wider shadow-lg">
              Fresh 900° Brick Oven
            </div>

            {/* Photo / 3D Asset */}
            <div className="relative rounded-2xl overflow-hidden aspect-video border border-white/10 bg-slate-900">
              <img
                src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80"
                alt="Wood Fired Artisanal Pizza"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-bold">
                <span>Signature Truffle Crust</span>
                <span className="px-2 py-0.5 rounded bg-primary-500 text-white font-extrabold text-[11px]">$18.99</span>
              </div>
            </div>

            {/* Bottom Info Bar */}
            <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
                <span className="font-bold text-white">Live Kitchen Baking</span>
              </div>
              <span className="font-mono text-primary-400 font-bold">Stitch 3D Model</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
export default HeroSection;
