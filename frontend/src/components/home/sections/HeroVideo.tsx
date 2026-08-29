import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import { ArrowRight, Sparkles, Flame } from 'lucide-react';

export default function HeroVideo({ config, viewMode = 'desktop' }: { config: any; viewMode?: string }) {
  const navigate = useNavigate();
  const isMobile = viewMode === 'mobile';
  const activeMediaUrl = (isMobile && config.useSeparateMobileMedia && config.mobileMediaUrl) 
    ? config.mobileMediaUrl 
    : (config.mediaUrl || '');

  const isVideo = activeMediaUrl.match(/\.(mp4|mov|webm)(\?.*)?$/i) || activeMediaUrl.includes('/video/upload/') || config.mediaType === 'video';

  const getAnimationProps = () => {
    switch(config.animationType) {
      case 'Pop': return { initial: { scale: 0.85, opacity: 0 }, animate: { scale: 1, opacity: 1 } };
      case 'Slide': return { initial: { x: -40, opacity: 0 }, animate: { x: 0, opacity: 1 } };
      case 'Floating': return { initial: { y: 15, opacity: 0 }, animate: { y: [0, -6, 0], opacity: 1 }, transition: { repeat: Infinity, duration: 4 } };
      case 'Fade Up': return { initial: { y: 30, opacity: 0 }, animate: { y: 0, opacity: 1 } };
      default: return { initial: { opacity: 0 }, animate: { opacity: 1 } };
    }
  };

  const handleAction = () => {
    const actionType = config.buttonAction?.type || 'OPEN_MENU';
    if (actionType === 'OPEN_OFFERS') {
      navigate('/menu?tab=combos');
    } else if (actionType === 'OPEN_CART') {
      // open cart
    } else {
      navigate('/menu');
    }
  };

  const bg = config.styleOverrides?.backgroundColor || '#0F172A';
  const textCol = config.styleOverrides?.textColor || '#FFFFFF';

  return (
    <div 
      className="relative w-full min-h-[420px] sm:min-h-[520px] md:min-h-[600px] flex items-center justify-center overflow-hidden rounded-3xl shadow-2xl p-6 sm:p-12 text-center"
      style={{ backgroundColor: bg }}
    >
      {/* Background Media (Video vs Image) */}
      {activeMediaUrl ? (
        isVideo ? (
          <video 
            autoPlay 
            muted 
            loop 
            playsInline
            src={activeMediaUrl} 
            className="absolute inset-0 w-full h-full object-cover opacity-50 z-0" 
          />
        ) : (
          <img 
            src={activeMediaUrl} 
            alt="Hero Media" 
            className="absolute inset-0 w-full h-full object-cover opacity-50 z-0 scale-105 transition-transform duration-1000" 
          />
        )
      ) : (
        <div className="absolute inset-0 bg-gradient-to-tr from-orange-950/80 via-black to-slate-950 opacity-90 z-0" />
      )}

      {/* Atmospheric Vignette Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 z-0 pointer-events-none" />

      {/* Live Social Proof Badge on Hero */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-bold text-amber-300 flex items-center gap-1.5 shadow-lg">
        <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
        <span>🔥 34 foodies in Rajnandgaon ordering right now</span>
      </div>
      
      <motion.div 
        {...getAnimationProps()}
        className="relative z-10 text-center max-w-3xl space-y-4 sm:space-y-6 pt-6"
      >
        <h2 
          className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight drop-shadow-2xl leading-tight"
          style={{ color: textCol }}
        >
          {config.headline || 'Olive Pizza'}
        </h2>

        {config.subtitle && (
          <p 
            className="text-sm sm:text-lg md:text-xl font-medium max-w-2xl mx-auto drop-shadow opacity-90 leading-relaxed"
            style={{ color: textCol }}
          >
            {config.subtitle}
          </p>
        )}

        {config.buttonText && (
          <motion.button 
            onClick={handleAction}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black rounded-full text-base sm:text-lg shadow-[0_0_35px_rgba(249,115,22,0.5)] transition-all inline-flex items-center gap-2.5 cursor-pointer"
          >
            <span>{config.buttonText}</span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
