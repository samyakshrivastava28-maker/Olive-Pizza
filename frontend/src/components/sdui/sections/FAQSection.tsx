import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { SDUISection } from '../../../types/sdui.types';

const defaultFaqs = [
  { q: 'How fast is delivery?', a: 'Our average delivery time is 25-30 minutes using specialized thermal delivery boxes.' },
  { q: 'Are all pizzas made fresh to order?', a: 'Yes! Every pizza is hand-stretched and baked in our high-temp wood-fired stone oven upon receiving your order.' },
  { q: 'What payment methods do you accept?', a: 'We accept UPI, Credit/Debit Cards, NetBanking, Mobile Wallets, and Cash on Delivery.' },
  { q: 'Can I track my order live?', a: 'Yes, our 3D GPS map tracking allows real-time live location tracking of your delivery partner.' }
];

export const FAQSection: React.FC<{ section: SDUISection }> = ({ section }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const faqs = section.config?.faqs || defaultFaqs;

  return (
    <div className="w-full my-8 max-w-4xl mx-auto px-4">
      <div className="flex items-center gap-3 mb-6">
        <HelpCircle className="w-6 h-6 text-primary-500" />
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">{section.label || 'Frequently Asked Questions'}</h3>
          {section.subtitle && <p className="text-xs text-slate-400">{section.subtitle}</p>}
        </div>
      </div>
      <div className="space-y-3">
        {faqs.map((faq: any, i: number) => {
          const isOpen = openIndex === i;
          return (
            <div key={i} className="border border-white/10 rounded-2xl bg-slate-900/60 overflow-hidden backdrop-blur-md">
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full px-5 py-4 flex items-center justify-between text-left font-semibold text-white hover:bg-white/5 transition-all"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary-400' : ''}`} />
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-5 pb-4 text-sm text-slate-300 border-t border-white/5 pt-3"
                  >
                    {faq.a}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default FAQSection;
