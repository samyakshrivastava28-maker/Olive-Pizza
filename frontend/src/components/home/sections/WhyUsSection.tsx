import React from 'react';
import { motion } from 'framer-motion';
import { Flame, ShieldCheck, Zap, Award, Sparkles } from 'lucide-react';
import { SimplifiedSectionSchema } from '../../../types/PageSchema';

interface WhyUsSectionProps {
  config: SimplifiedSectionSchema['config'];
}

export default function WhyUsSection({ config }: WhyUsSectionProps) {
  const headline = config?.headline || 'Why Foodies Choose Olive Pizza';
  const subtitle = config?.subtitle || 'Hand-stretched wood-fired perfection made fresh on every order';

  const reasons = [
    {
      icon: Flame,
      title: 'Wood-Fired Stone Oven',
      description: 'Baked at 450°C for an authentic blistered leopard crust with smoky aromatic crunch.',
      color: 'text-amber-400',
      badge: '450°C Oven',
    },
    {
      icon: ShieldCheck,
      title: '100% Pure Mozzarella',
      description: 'Zero cheese analogues, zero trans-fat oils. Only authentic slow-melt dairy mozzarella.',
      color: 'text-emerald-400',
      badge: 'Zero Artificial',
    },
    {
      icon: Zap,
      title: '25-Minute Delivery Pledge',
      description: 'Rider dispatch begins while your pizza is still bubbling hot, packed in thermal insulated bags.',
      color: 'text-orange-400',
      badge: 'Thermal Packed',
    },
  ];

  return (
    <section className="px-4 py-8 sm:py-12 max-w-6xl mx-auto w-full">
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-400 text-xs font-bold uppercase tracking-wider mb-3"
        >
          <Sparkles className="w-3.5 h-3.5" />
          The Olive Pizza Promise
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight"
        >
          {headline}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-sm sm:text-base text-slate-400 mt-2 leading-relaxed"
        >
          {subtitle}
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {reasons.map((r, idx) => {
          const Icon = r.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 * idx }}
              className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-primary-500/40 backdrop-blur-md flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center ${r.color} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400">
                    {r.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{r.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{r.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
