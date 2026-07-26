import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router';
import { Timer, ArrowRight, Copy, Check } from 'lucide-react';

interface CountdownOfferBlockProps {
  title?: string;
  subtitle?: string;
  targetDateIso?: string;
  discountCode?: string;
  ctaText?: string;
  ctaLink?: string;
}

export default function CountdownOfferBlock({
  title = 'Midnight Feast Flash Sale',
  subtitle = 'Get 40% OFF all wood-fired pizzas before the timer expires!',
  targetDateIso,
  discountCode = 'MIDNIGHT40',
  ctaText = 'Order Before It Ends',
  ctaLink = '/menu',
}: CountdownOfferBlockProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 15 });

  useEffect(() => {
    // Target time: either passed targetDateIso or default 4.5 hours from now
    const target = targetDateIso
      ? new Date(targetDateIso).getTime()
      : Date.now() + 4.5 * 3600 * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, target - now);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDateIso]);

  const handleCopyCode = () => {
    if (discountCode) {
      navigator.clipboard.writeText(discountCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-10 px-4 sm:px-6">
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-red-950 via-orange-950 to-amber-950 border border-orange-500/30 p-8 sm:p-12 text-center shadow-2xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-orange-500/20 border border-orange-500/40 text-orange-400 mb-6">
          <Timer className="w-4 h-4" />
          Limited Time Flash Deal
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
          {title}
        </h2>
        {subtitle && (
          <p className="text-base sm:text-xl text-slate-300 font-medium max-w-2xl mx-auto mb-8">
            {subtitle}
          </p>
        )}

        {/* Countdown Grid */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 mb-8">
          {[
            { label: 'Hours', value: String(timeLeft.hours).padStart(2, '0') },
            { label: 'Minutes', value: String(timeLeft.minutes).padStart(2, '0') },
            { label: 'Seconds', value: String(timeLeft.seconds).padStart(2, '0') },
          ].map((unit, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black/60 border border-orange-500/30 backdrop-blur-md flex items-center justify-center text-2xl sm:text-4xl font-black text-amber-400 shadow-inner">
                {unit.value}
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                {unit.label}
              </span>
            </div>
          ))}
        </div>

        {/* Coupon Code Pill */}
        {discountCode && (
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-black/50 border border-white/20 mb-8">
            <span className="text-xs text-slate-400 font-medium">Use Code:</span>
            <span className="text-sm font-black text-amber-400 tracking-wider">
              {discountCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Copy Code"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

        <div>
          <Link
            to={ctaLink}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-base text-neutral-950 bg-amber-400 hover:bg-amber-300 shadow-xl transition-all active:scale-95"
          >
            {ctaText}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
