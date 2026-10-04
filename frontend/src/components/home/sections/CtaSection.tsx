import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router';
import { SimplifiedSectionSchema } from '../../../types/PageSchema';

interface CtaSectionProps {
  config: SimplifiedSectionSchema['config'];
}

export default function CtaSection({ config }: CtaSectionProps) {
  const navigate = useNavigate();
  const headline = config?.headline || 'Ready for the Best Slice of Your Life?';
  const subtitle = config?.subtitle || 'Wood-fired crusts, authentic Italian sauces, and fresh mozzarella delivered hot to your doorstep.';
  const buttonText = config?.buttonText || 'ORDER PIZZA NOW';

  const handleClick = () => {
    if (config?.buttonAction?.type === 'NAVIGATE' && config.buttonAction.target) {
      navigate(config.buttonAction.target);
    } else {
      const menuEl = document.getElementById('menu-section');
      if (menuEl) {
        menuEl.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate('/menu');
      }
    }
  };

  return (
    <section className="px-4 py-8 max-w-6xl mx-auto w-full">
      <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-orange-600/30 via-amber-600/20 to-primary-600/30 border border-orange-500/30 text-center relative overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-bold uppercase tracking-wider"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Fresh From Wood-Fired Oven
          </motion.div>

          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            {headline}
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl mx-auto">
            {subtitle}
          </p>

          <div className="pt-2">
            <button
              onClick={handleClick}
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-orange-500/25 transition-all transform hover:scale-105 active:scale-95 inline-flex items-center gap-2"
            >
              <span>{buttonText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
