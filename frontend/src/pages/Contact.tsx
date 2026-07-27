import { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, Mail, MapPin, Clock, MessageSquare, Send, CheckCircle2, 
  Copy, ExternalLink, ShieldCheck, HelpCircle, Navigation, Share2, 
  Flame, Sparkles, ChevronDown, HeartHandshake, AlertCircle, Headphones
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import SEO from '../components/SEO';
import Galaxy from '../components/ui/Galaxy';
import { useDataStore } from '../lib/dataStore';
import { OpenInMapsButton } from '../components/ui/OpenInMapsButton';
import toast from 'react-hot-toast';

const LocationMap = lazy(() => import('../components/ui/LocationMap'));

// FAQ Items by Category
const FAQ_ITEMS = [
  {
    category: 'Orders',
    q: 'How can I place an order for delivery or pickup?',
    a: 'You can easily order directly through our website or mobile app! Simply select your handcrafted pizzas, add extra toppings or crust customizations, and proceed to checkout with live GPS delivery tracking.'
  },
  {
    category: 'Orders',
    q: 'Can I schedule an order for later in the day?',
    a: 'Yes! If our kitchen is currently closed or if you want your pizza delivered at a specific time, you can schedule pre-orders directly from the checkout page.'
  },
  {
    category: 'Delivery',
    q: 'What is your delivery coverage area in Rajnandgaon?',
    a: 'We deliver fresh hot pizzas within a 5 km radius of our kitchen at Dongargaon Rd, near Saraswati School, Gokul Nagar, Rajnandgaon. Average delivery time is 30–40 minutes.'
  },
  {
    category: 'Delivery',
    q: 'What happens if my order is delayed?',
    a: 'Our live GPS tracking system monitors rider movements in real-time. If your order encounters unexpected traffic or delays, our support team will notify you immediately.'
  },
  {
    category: 'Payments',
    q: 'Which payment methods are accepted?',
    a: 'We accept UPI (Google Pay, PhonePe, Paytm), Credit & Debit Cards, Net Banking, and Cash on Delivery (COD).'
  },
  {
    category: 'Coupons',
    q: 'How do I apply promotional coupons?',
    a: 'During checkout or inside your cart, enter your coupon code (e.g. BEST50) in the promo box and click Apply to instantly receive your discount!'
  },
  {
    category: 'AI Assistant',
    q: 'How does the Olive AI Assistant work?',
    a: 'Our Olive AI Assistant helps you find personalized pizza recommendations based on your taste, track active orders, calculate delivery estimates, and explore active coupons.'
  }
];

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export default function Contact() {
  const storeStatus = useDataStore((state) => state.storeStatus);

  // Form State with LocalStorage Draft Auto-save
  const [formData, setFormData] = useState<ContactFormData>(() => {
    const saved = localStorage.getItem('olive_contact_draft');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback to initial state if JSON is corrupted
      }
    }
    return { name: '', email: '', phone: '', subject: 'General Query', message: '' };
  });

  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [activeFaqCategory, setActiveFaqCategory] = useState('All');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);

  // Save draft on edit
  useEffect(() => {
    localStorage.setItem('olive_contact_draft', JSON.stringify(formData));
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard! 📋`, {
      style: { background: '#1e1e1e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSentSuccess(true);
      localStorage.removeItem('olive_contact_draft');
      toast.success('Your message has been sent to Olive Pizza Support! 🍕');
    }, 1200);
  };

  const filteredFaqs = activeFaqCategory === 'All' 
    ? FAQ_ITEMS 
    : FAQ_ITEMS.filter(item => item.category === activeFaqCategory);

  const isLiveOpen = storeStatus.isRestaurantOpen && storeStatus.isWithinBusinessHours;

  return (
    <>
      <SEO 
        title="Contact Us & Support"
        description="Get in touch with Olive Pizza Rajnandgaon. Phone, email, WhatsApp, live location map, FAQs, and support."
        canonicalUrl="/contact"
      />

      <PageTransition className="w-full relative min-h-screen text-white pb-32">
        {/* Background Space Galaxy Effect */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-60">
          <Galaxy
            mouseInteraction={false}
            mouseRepulsion={false}
            density={0.2}
            speed={0.2}
            starSpeed={0.05}
            glowIntensity={0.15}
            twinkleIntensity={0.2}
            transparent={false}
          />
        </div>

        <div className="relative z-10 pt-4 md:pt-10">
          <div className="responsive-container space-y-8 md:space-y-12">

            {/* ── 1. Hero Header Section ── */}
            <div className="text-center max-w-3xl mx-auto space-y-4 relative py-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-dark-900/90 border border-amber-400/30 px-4 py-1.5 rounded-full text-xs font-bold text-amber-400 shadow-lg"
              >
                <Sparkles size={14} className="animate-spin-slow" />
                <span>We're Here For You • 24/7 Customer Care</span>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-fluid-h1 font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-primary-300 drop-shadow-[0_0_25px_rgba(245,158,11,0.3)]"
              >
                Get in Touch with Ölive Pizza
              </motion.h1>

              <p className="text-fluid-body text-slate-300 max-w-xl mx-auto font-medium leading-relaxed">
                Have questions about our artisanal menu, delivery zones, or special party orders? Reach out via phone, WhatsApp, or drop us a message below!
              </p>

              {/* Live Operating Hours & Response Time Pill */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <div className={`px-4 py-2 rounded-full border flex items-center gap-2 text-xs font-bold shadow-md ${
                  isLiveOpen ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400' : 'bg-rose-950/60 border-rose-500/40 text-rose-400'
                }`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${isLiveOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  <span>{isLiveOpen ? 'Restaurant Open Now (12 PM – 11:30 PM)' : 'Currently Closed (Opens at 12:00 PM)'}</span>
                </div>

                <div className="px-4 py-2 rounded-full bg-dark-900/80 border border-white/10 text-xs font-bold text-slate-300 flex items-center gap-2 shadow-md">
                  <Clock size={14} className="text-amber-400" />
                  <span>Avg. Support Response: &lt; 5 mins</span>
                </div>
              </div>
            </div>

            {/* ── 2. Primary Contact Cards Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              
              {/* Phone Card */}
              <motion.div 
                whileHover={{ y: -6, scale: 1.02 }}
                className="bg-dark-900/90 border border-white/12 rounded-3xl p-5 md:p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Phone size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Phone Hotline</h3>
                    <p className="text-xs text-slate-400">Instant verbal assistance</p>
                  </div>
                  <p className="font-black text-amber-400 text-lg tracking-tight">+91 98765 43210</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/8 mt-4">
                  <a 
                    href="tel:+919876543210" 
                    className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-dark-950 font-black text-xs text-center transition-colors min-touch-target"
                  >
                    Call Now
                  </a>
                  <button 
                    onClick={() => handleCopy('+919876543210', 'Phone Number')}
                    className="py-2 px-3 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1 transition-colors min-touch-target border border-white/10"
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
              </motion.div>

              {/* WhatsApp Card */}
              <motion.div 
                whileHover={{ y: -6, scale: 1.02 }}
                className="bg-dark-900/90 border border-white/12 rounded-3xl p-5 md:p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <MessageSquare size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">WhatsApp Support</h3>
                    <p className="text-xs text-slate-400">Quick chat & order help</p>
                  </div>
                  <p className="font-black text-emerald-400 text-lg tracking-tight">+91 98765 43210</p>
                </div>

                <div className="pt-4 border-t border-white/8 mt-4">
                  <a 
                    href="https://wa.me/919876543210?text=Hi%20Olive%20Pizza!%20I%20need%20help%20with%20my%20order." 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs text-center flex items-center justify-center gap-2 transition-colors min-touch-target shadow-md"
                  >
                    <MessageSquare size={14} /> Open WhatsApp Chat
                  </a>
                </div>
              </motion.div>

              {/* Email Support Card */}
              <motion.div 
                whileHover={{ y: -6, scale: 1.02 }}
                className="bg-dark-900/90 border border-white/12 rounded-3xl p-5 md:p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center text-primary-400">
                    <Mail size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Email Support</h3>
                    <p className="text-xs text-slate-400">Feedback & inquiries</p>
                  </div>
                  <p className="font-bold text-slate-200 text-sm truncate">support@olivepizza.com</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/8 mt-4">
                  <a 
                    href="mailto:support@olivepizza.com" 
                    className="py-2 px-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs text-center transition-colors min-touch-target"
                  >
                    Send Email
                  </a>
                  <button 
                    onClick={() => handleCopy('support@olivepizza.com', 'Email Address')}
                    className="py-2 px-3 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1 transition-colors min-touch-target border border-white/10"
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
              </motion.div>

              {/* Kitchen Location Card */}
              <motion.div 
                whileHover={{ y: -6, scale: 1.02 }}
                className="bg-dark-900/90 border border-white/12 rounded-3xl p-5 md:p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <MapPin size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Rajnandgaon Kitchen</h3>
                    <p className="text-xs text-slate-400">Gokul Nagar Branch</p>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2">Dongargaon Rd, near Saraswati School, Rajnandgaon, CG</p>
                </div>

                <div className="pt-4 border-t border-white/8 mt-4">
                  <OpenInMapsButton className="w-full py-2.5 px-3 rounded-xl bg-dark-800 hover:bg-dark-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/10 min-touch-target" />
                </div>
              </motion.div>

            </div>

            {/* ── 3. Interactive Contact Form & Live Map ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left: Contact Form (7 Columns) */}
              <div className="lg:col-span-7 bg-dark-900/90 border border-white/12 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-2">
                    <Send className="text-amber-400" size={22} /> Send Us a Message
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Fill in your details below and our restaurant team will get back to you shortly.
                  </p>
                </div>

                {sentSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-950/60 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-4"
                  >
                    <CheckCircle2 size={48} className="text-emerald-400 mx-auto animate-bounce" />
                    <div>
                      <h3 className="text-xl font-bold text-white">Message Delivered!</h3>
                      <p className="text-xs text-slate-300 mt-1">Thank you for reaching out to Olive Pizza. We'll reply via email within 5 minutes.</p>
                    </div>
                    <button 
                      onClick={() => { setSentSuccess(false); setFormData({ name: '', email: '', phone: '', subject: 'General Query', message: '' }); }}
                      className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                    >
                      Send Another Message
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          required
                          placeholder="Your Name"
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full bg-dark-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          placeholder="+91 98765 43210"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full bg-dark-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          name="email"
                          required
                          placeholder="name@example.com"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full bg-dark-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Subject Topic
                        </label>
                        <select
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          className="w-full bg-dark-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                        >
                          <option value="General Query">General Query</option>
                          <option value="Order Status">Order Status Inquiry</option>
                          <option value="Party Booking">Bulk / Party Booking</option>
                          <option value="Feedback">Feedback & Suggestions</option>
                          <option value="Franchise">Franchise Inquiry</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Your Message *
                      </label>
                      <textarea
                        name="message"
                        required
                        rows={4}
                        placeholder="Tell us how we can help you..."
                        value={formData.message}
                        onChange={handleChange}
                        className="w-full bg-dark-950 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sending}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-950 font-black py-4 rounded-2xl transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 min-touch-target"
                    >
                      {sending ? (
                        <span>Sending Message...</span>
                      ) : (
                        <>
                          <Send size={16} /> Send Message Now
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* Right: Embedded Google Map & Branch Details (5 Columns) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-dark-900/90 border border-white/12 rounded-3xl p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                      <MapPin className="text-emerald-400" size={18} /> Our Main Branch
                    </h3>
                    <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      Rajnandgaon, CG
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Dongargaon Rd, near Saraswati School, Gokul Nagar, Rajnandgaon, Chhattisgarh 491441
                  </p>

                  <div className="h-64 rounded-2xl overflow-hidden border border-white/10 shadow-inner">
                    <Suspense fallback={<div className="w-full h-full bg-dark-800 animate-pulse flex items-center justify-center text-xs text-slate-400">Loading Location Map...</div>}>
                      <LocationMap className="w-full h-full" showRadius={true} />
                    </Suspense>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <OpenInMapsButton className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs text-center transition-colors min-touch-target" />
                    <button 
                      onClick={() => handleCopy('Dongargaon Rd, near Saraswati School, Gokul Nagar, Rajnandgaon, Chhattisgarh 491441', 'Address')}
                      className="py-2.5 px-3 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/10 min-touch-target"
                    >
                      <Copy size={12} /> Copy Address
                    </button>
                  </div>
                </div>

                {/* Emergency Order Support Floating Card */}
                <div className="bg-gradient-to-br from-amber-500/15 via-dark-900 to-dark-900 border border-amber-500/30 rounded-3xl p-5 shadow-xl space-y-3">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertCircle size={20} />
                    <h4 className="font-black text-white text-sm">Need Instant Order Help?</h4>
                  </div>
                  <p className="text-xs text-slate-300">
                    If you have an ongoing active delivery or urgent query, reach our hotline directly.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <a 
                      href="tel:+919876543210" 
                      className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-dark-950 font-black text-xs text-center transition-colors min-touch-target"
                    >
                      📞 Call Support
                    </a>
                    <a 
                      href="https://wa.me/919876543210" 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs text-center transition-colors min-touch-target"
                    >
                      💬 WhatsApp
                    </a>
                  </div>
                </div>
              </div>

            </div>

            {/* ── 4. Frequently Asked Questions (FAQ Accordion) ── */}
            <div className="space-y-6 pt-6">
              <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-black text-white">Frequently Asked Questions</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">Quick answers to common questions about orders, payments, and delivery.</p>
              </div>

              {/* FAQ Category Filters */}
              <div className="flex justify-center gap-2 overflow-x-auto hide-scrollbar py-1">
                {['All', 'Orders', 'Delivery', 'Payments', 'Coupons', 'AI Assistant'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveFaqCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border min-touch-target ${
                      activeFaqCategory === cat 
                        ? 'bg-primary-600 text-white border-primary-400 shadow-md' 
                        : 'bg-dark-900/80 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* FAQ Accordion Cards */}
              <div className="max-w-3xl mx-auto space-y-3">
                {filteredFaqs.map((faq, idx) => {
                  const isExpanded = expandedFaqIndex === idx;
                  return (
                    <motion.div 
                      key={idx}
                      className="bg-dark-900/90 border border-white/10 rounded-2xl overflow-hidden shadow-lg transition-all"
                    >
                      <button
                        onClick={() => setExpandedFaqIndex(isExpanded ? null : idx)}
                        className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-white hover:text-amber-400 transition-colors min-touch-target"
                      >
                        <span className="flex items-center gap-3">
                          <HelpCircle size={18} className="text-amber-400 shrink-0" />
                          {faq.q}
                        </span>
                        <ChevronDown size={18} className={`shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-amber-400' : 'text-slate-400'}`} />
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/5 bg-dark-950/40"
                          >
                            {faq.a}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* ── 5. Social Media Connections ── */}
            <div className="bg-dark-900/80 border border-white/10 rounded-3xl p-6 text-center space-y-4">
              <h3 className="font-black text-white text-lg">Follow Olive Pizza Socials</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">Get daily pizza creation videos, secret discount codes, and community updates!</p>
              
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                {[
                  { name: 'Instagram', handle: '@olivepizza.official', link: '#', icon: '📸', color: 'hover:border-rose-500/50' },
                  { name: 'Facebook', handle: 'Olive Pizza India', link: '#', icon: '📘', color: 'hover:border-blue-500/50' },
                  { name: 'YouTube', handle: 'Olive Pizza Kitchen', link: '#', icon: '🎬', color: 'hover:border-red-500/50' },
                  { name: 'WhatsApp Channel', handle: 'Olive Pizza Deals', link: 'https://wa.me/919876543210', icon: '💬', color: 'hover:border-emerald-500/50' }
                ].map((social, idx) => (
                  <a
                    key={idx}
                    href={social.link}
                    target="_blank"
                    rel="noreferrer"
                    className={`px-4 py-2.5 rounded-2xl bg-dark-950 border border-white/10 text-xs font-bold text-slate-300 flex items-center gap-2 transition-all hover:scale-105 ${social.color}`}
                  >
                    <span>{social.icon}</span>
                    <span>{social.name}</span>
                    <span className="text-[10px] text-amber-400 font-normal">✓ Verified</span>
                  </a>
                ))}
              </div>
            </div>

          </div>
        </div>
      </PageTransition>
    </>
  );
}
