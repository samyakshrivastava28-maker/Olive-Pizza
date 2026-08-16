import { useState, useMemo } from 'react';
import LegalPageLayout, { TocItem, HighlightCard } from '../components/layout/LegalPageLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, Search, ChevronDown, ShoppingBag, CreditCard, 
  Truck, RefreshCw, Gift, Sparkles, MessageCircle, Mail, Phone, ArrowRight, Clock 
} from 'lucide-react';
import { Link } from 'react-router';

interface FAQItem {
  id: string;
  category: 'ordering' | 'payments' | 'delivery' | 'refunds' | 'loyalty';
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  // Ordering
  {
    id: "order-1",
    category: "ordering",
    question: "How do I place an order?",
    answer: "Simply browse our menu, customize your favorite artisan pizzas and sides, add items to your cart, and proceed to checkout. You can easily order with your account to earn reward points or proceed as a registered customer."
  },
  {
    id: "order-2",
    category: "ordering",
    question: "Can I schedule an order for later?",
    answer: "Yes! During checkout, you can select 'Scheduled Delivery' and choose a specific future date and time window for your food to arrive fresh and hot."
  },

  // Payments
  {
    id: "pay-1",
    category: "payments",
    question: "What payment methods do you accept?",
    answer: "We accept all major credit and debit cards (Visa, MasterCard, RuPay), UPI (Google Pay, PhonePe, Paytm), digital mobile wallets, and Cash on Delivery (COD)."
  },
  {
    id: "pay-2",
    category: "payments",
    question: "Is my payment information secure?",
    answer: "Absolutely. All transactions are routed through certified, PCI-DSS compliant payment gateways with 256-bit SSL encryption. We never store your raw credit card numbers or banking passwords on our servers."
  },

  // Delivery
  {
    id: "del-1",
    category: "delivery",
    question: "How can I track my order in real-time?",
    answer: "Once your pizza leaves our oven and is dispatched with a driver, you can follow your delivery partner live via our interactive GPS tracking map in your Customer Dashboard."
  },
  {
    id: "del-2",
    category: "delivery",
    question: "Do you offer No-Contact Delivery?",
    answer: "Yes, you can check the 'No Contact Delivery' option during checkout. Our delivery partner will safely place your package at your doorstep, ring the bell, and upload a digital photo confirmation to your order record."
  },

  // Refunds
  {
    id: "ref-1",
    category: "refunds",
    question: "Can I cancel my order for a refund?",
    answer: "You can cancel your order for a 100% full refund at any time before the kitchen starts baking (status: 'Pending'). Once cooking commences or the order is out for delivery, cancellations cannot be fully refunded."
  },

  // Loyalty
  {
    id: "loy-1",
    category: "loyalty",
    question: "How do I earn and redeem loyalty reward points?",
    answer: "You automatically accumulate loyalty reward points for every completed order while signed in. Points can be applied at checkout for instant discounts on future artisan pizzas and combo meals."
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All Questions', icon: <HelpCircle className="w-4 h-4" /> },
  { id: 'ordering', label: 'Ordering', icon: <ShoppingBag className="w-4 h-4" /> },
  { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'delivery', label: 'Delivery & Tracking', icon: <Truck className="w-4 h-4" /> },
  { id: 'refunds', label: 'Refunds & Cancellations', icon: <RefreshCw className="w-4 h-4" /> },
  { id: 'loyalty', label: 'Loyalty & Offers', icon: <Gift className="w-4 h-4" /> }
];

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>('order-1');

  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesQuery = 
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  const toc: TocItem[] = [
    { id: "faq-search", label: "1. Search Questions" },
    { id: "faq-accordion", label: "2. Common Answers" },
    { id: "contact-support", label: "3. Direct Support" }
  ];

  const highlights: HighlightCard[] = [
    {
      icon: <Truck className="w-5 h-5" />,
      title: "Live GPS Tracking",
      description: "Follow your order status in real time on an interactive map."
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: "Instant Pre-Prep Cancel",
      description: "Cancel with 100% refund before cooking starts in the kitchen."
    },
    {
      icon: <Gift className="w-5 h-5" />,
      title: "Automated Rewards",
      description: "Earn points on every order to redeem for future pizza discounts."
    }
  ];

  const toggleAccordion = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <LegalPageLayout
      title="Frequently Asked Questions"
      subtitle="Quick Answers & Support for Olive Pizza"
      badge="Help & Customer Support"
      description="Find clear answers to common questions regarding ordering, live GPS tracking, payment options, and reward points."
      lastUpdated="June 30, 2026"
      toc={toc}
      highlights={highlights}
      icon={<HelpCircle className="w-3.5 h-3.5" />}
      canonicalUrl="/faq"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "FAQ", url: "/faq" }
      ]}
    >
      {/* ── Search & Filter Section ── */}
      <section id="faq-search" className="scroll-mt-28 space-y-4">
        {/* Search Input Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions (e.g., tracking, payment, cancel, loyalty)..."
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/15 focus:border-emerald-500 text-white placeholder-slate-400 text-sm focus:outline-none transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-white/5"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-dark-950 shadow-md shadow-emerald-500/20'
                    : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/5'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Accordion List Section ── */}
      <section id="faq-accordion" className="scroll-mt-28 space-y-3 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Showing {filteredFaqs.length} {filteredFaqs.length === 1 ? 'Answer' : 'Answers'}
          </span>
          {searchQuery && (
            <span className="text-xs text-emerald-400">
              Filtered by: "{searchQuery}"
            </span>
          )}
        </div>

        {filteredFaqs.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-3">
            <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-white">No matching answers found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              We couldn't find an answer matching "{searchQuery}". Try using different keywords or contact our team directly.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-colors"
            >
              Reset Search Filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map((faq) => {
              const isOpen = expandedId === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isOpen 
                      ? 'bg-[#121418] border-emerald-500/30 shadow-lg shadow-black/40' 
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(faq.id)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className={`text-sm sm:text-base font-bold transition-colors ${
                      isOpen ? 'text-emerald-300' : 'text-white'
                    }`}>
                      {faq.question}
                    </span>
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isOpen ? 'bg-emerald-500/20 text-emerald-400 rotate-180' : 'bg-white/5 text-slate-400'
                    }`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                      >
                        <div className="px-4 pb-5 sm:px-5 sm:pb-5 pt-0 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/5 mt-1">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section 3: Direct Support ── */}
      <section id="contact-support" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#121418] to-amber-950/30 border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-base font-bold text-white flex items-center justify-center sm:justify-start gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Still have a question?</span>
            </h3>
            <p className="text-xs text-slate-300">
              Our customer care specialists are available 7 days a week to assist you.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/contact"
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </section>
    </LegalPageLayout>
  );
}
