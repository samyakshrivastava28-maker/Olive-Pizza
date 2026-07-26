import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router';
import { ChevronLeft, ChevronRight, Tag } from 'lucide-react';

interface PromoBannerItem {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  link?: string;
  tag?: string;
}

interface PromoBannerCarouselProps {
  banners?: PromoBannerItem[];
  autoPlayIntervalMs?: number;
}

const DEFAULT_BANNERS: PromoBannerItem[] = [
  {
    id: '1',
    title: '50% OFF Your First Order',
    subtitle: 'Use code FIRST50 at checkout. Artisan wood-fired pizza.',
    image: 'https://res.cloudinary.com/diwh22z4a/image/upload/v1711200000/olive-pizza/hero_banner.png',
    badge: 'Limited Offer',
    ctaText: 'Claim 50% Off',
    ctaLink: '/menu',
  },
  {
    id: 'promo-2',
    title: 'Free Garlic Bread on ₹499+',
    subtitle: 'Use code CHEESY at checkout',
    image: 'https://res.cloudinary.com/diwh22z4a/image/upload/v1711200000/olive-pizza/garlic_bread.png',
    link: '/menu',
    tag: 'Chef Choice',
  },
];

export default function PromoBannerCarousel({
  banners = DEFAULT_BANNERS,
  autoPlayIntervalMs = 5000,
}: PromoBannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const list = banners.length > 0 ? banners : DEFAULT_BANNERS;

  useEffect(() => {
    if (list.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % list.length);
    }, autoPlayIntervalMs);
    return () => clearInterval(timer);
  }, [list.length, autoPlayIntervalMs]);

  const current = list[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + list.length) % list.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % list.length);
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6">
      <div className="relative h-[260px] sm:h-[340px] md:h-[400px] w-full rounded-3xl overflow-hidden shadow-2xl bg-neutral-900 border border-neutral-800">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id || currentIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-0"
          >
            <img
              src={current.image}
              alt={current.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent z-10" />
          </motion.div>
        </AnimatePresence>

        {/* Content */}
        <div className="relative z-20 h-full max-w-xl flex flex-col justify-center p-6 sm:p-10 md:p-12 text-left">
          {current.tag && (
            <span className="inline-flex items-center gap-1.5 self-start px-3 py-1 mb-3 rounded-full text-xs font-black bg-amber-500/20 border border-amber-500/30 text-amber-400 uppercase tracking-wider">
              <Tag className="w-3 h-3" />
              {current.tag}
            </span>
          )}
          <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-2">
            {current.title}
          </h2>
          {current.subtitle && (
            <p className="text-sm sm:text-base text-slate-300 font-medium mb-6 line-clamp-2">
              {current.subtitle}
            </p>
          )}

          {current.link && (
            <Link
              to={current.link}
              className="inline-flex items-center justify-center self-start px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-neutral-900 bg-amber-400 hover:bg-amber-300 transition-all shadow-lg active:scale-95"
            >
              Claim Offer
            </Link>
          )}
        </div>

        {/* Navigation Arrows */}
        {list.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white transition-all active:scale-90"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white transition-all active:scale-90"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Pagination Dots */}
        {list.length > 1 && (
          <div className="absolute bottom-4 right-6 z-30 flex items-center gap-2">
            {list.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentIndex
                    ? 'w-6 bg-amber-400'
                    : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
