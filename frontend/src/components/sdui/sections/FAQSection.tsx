import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface FAQProps {
  config?: {
    title?: string;
    subtitle?: string;
    items?: Array<{ question: string; answer: string }>;
  };
}

const DEFAULT_FAQS = [
  {
    question: 'How fast is delivery from Olive Pizza in Rajnandgaon?',
    answer: 'We deliver fresh, piping hot gourmet pizzas within 30 to 40 minutes across Rajnandgaon, with live 3D GPS tracking so you can monitor your delivery partner in real time.',
  },
  {
    question: 'Do you offer 100% vegetarian pizzas?',
    answer: 'Yes! We have an extensive menu of 100% pure vegetarian pizzas, cheesy garlic breads, stuffed calzones, and handcrafted mocktails.',
  },
  {
    question: 'How do I apply coupon codes?',
    answer: 'Select your favorite items, proceed to checkout or click on any coupon banner on the homepage to instantly auto-apply the best discount to your cart.',
  },
  {
    question: 'Can I track my order live?',
    answer: 'Absolutely! Our state-of-the-art live order tracking page shows baking progress and real-time 3D delivery GPS with live route updates.',
  },
];

export const FAQSection: React.FC<FAQProps> = ({ config }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const title = config?.title || 'Frequently Asked Questions';
  const subtitle = config?.subtitle || 'Everything you need to know about ordering from Olive Pizza';
  const items = config?.items && config.items.length > 0 ? config.items : DEFAULT_FAQS;

  return (
    <section className="py-12 px-4 max-w-4xl mx-auto relative z-10">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white">{title}</h2>
        <p className="text-slate-400 text-sm mt-2">{subtitle}</p>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden transition-colors"
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
              >
                <span className="text-white font-semibold text-sm md:text-base pr-4">{item.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                    isOpen ? 'rotate-180 text-primary-400' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4 pt-1 text-slate-300 text-sm leading-relaxed border-t border-white/5">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
};
export default FAQSection;
