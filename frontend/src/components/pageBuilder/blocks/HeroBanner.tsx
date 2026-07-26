import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router';
import { Search, ChevronRight, Sparkles } from 'lucide-react';

interface HeroBannerProps {
  headline?: string;
  subtext?: string;
  bgImage?: string;
  bgVideo?: string;
  ctaText?: string;
  ctaLink?: string;
  overlayOpacity?: number;
  showSearchInput?: boolean;
}

export default function HeroBanner({
  headline = 'Crafted for Connoisseurs.',
  subtext = 'Handcrafted with premium artisan ingredients. Delivered hot to your door.',
  bgImage = 'https://res.cloudinary.com/dxmlvkff1/image/upload/f_auto,q_auto:best,w_1920/v1783008946/olive-pizza-hero-background_d9rbzc.webp',
  bgVideo,
  ctaText = 'Order Now',
  ctaLink = '/menu',
  overlayOpacity = 0.65,
  showSearchInput = true,
}: HeroBannerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/menu?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/menu');
    }
  };

  return (
    <div className="relative w-full overflow-hidden flex items-center justify-center min-h-[520px] md:min-h-[640px] py-16 px-4 md:px-12">
      {/* Background Video or Image */}
      <div className="absolute inset-0 z-0">
        {bgVideo ? (
          <video
            src={bgVideo}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={bgImage}
            alt="Hero Background"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Dynamic Overlay */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `linear-gradient(to top, rgba(10,10,10,0.95) 0%, rgba(10,10,10,${overlayOpacity}) 60%, rgba(10,10,10,0.4) 100%)`,
        }}
      />

      {/* Content Container */}
      <div className="relative z-20 max-w-4xl w-full text-left flex flex-col items-start justify-center">
        {/* Premium Badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase bg-white/10 backdrop-blur-md border border-white/20 text-amber-400"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Olive Artisan Kitchen
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tight mb-4"
        >
          {headline}
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-base md:text-xl text-slate-300 font-medium leading-relaxed mb-8 max-w-xl"
        >
          {subtext}
        </motion.p>

        {/* Search-Forward Bar */}
        {showSearchInput && (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            onSubmit={handleSearchSubmit}
            className="w-full max-w-lg mb-6 relative flex items-center"
          >
            <Search className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pizzas, sides, drinks..."
              className="w-full pl-12 pr-28 py-4 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/25 text-white placeholder-slate-400 font-medium text-sm focus:outline-none focus:border-amber-400 transition-all shadow-xl"
            />
            <button
              type="submit"
              className="absolute right-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md transition-all active:scale-95"
            >
              Search
            </button>
          </motion.form>
        )}

        {/* CTA Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          <Link
            to={ctaLink}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-base text-white bg-gradient-to-r from-primary-600 to-orange-500 hover:from-primary-700 hover:to-orange-600 shadow-xl shadow-orange-500/25 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            {ctaText}
            <ChevronRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
