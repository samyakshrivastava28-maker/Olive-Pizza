import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router';
import { useCartStore } from '../lib/store';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export default function AIAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const cartStore = useCartStore();
  
  const [showPopup, setShowPopup] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (isDismissed || isHidden) {
      setShowPopup(false);
      return;
    }
    const interval = setInterval(() => {
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 5000);
    }, 60000);
    return () => clearInterval(interval);
  }, [isDismissed, isHidden]);

  const cartCount = cartStore.items.reduce((acc, item) => acc + item.quantity, 0);
  const isCartVisible = cartCount > 0 && !['/cart', '/checkout'].includes(location.pathname) && !location.pathname.startsWith('/owner') && !location.pathname.startsWith('/delivery');

  if (isHidden) {
    return (
      <button 
        onClick={() => setIsHidden(false)} 
        className="fixed bottom-24 md:bottom-6 right-0 bg-primary-500 text-white p-2 rounded-l-xl z-50 shadow-lg flex items-center hover:bg-primary-600 transition-colors"
      >
        <ChevronLeft size={20} />
      </button>
    );
  }

  return (
    <div className={`fixed right-4 md:right-6 z-50 flex flex-col items-end gap-2 transition-all duration-300 ${isCartVisible ? 'bottom-[160px]' : 'bottom-20'} md:bottom-6 opacity-100 translate-y-0`}>
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-4 py-3 rounded-2xl rounded-br-sm shadow-xl border border-slate-200 dark:border-slate-700 text-sm font-bold flex items-center gap-3 cursor-pointer"
            onClick={() => { setShowPopup(false); navigate('/assistant'); }}
          >
            Ask me anything! ✨
            <button 
              onClick={(e) => { e.stopPropagation(); setShowPopup(false); setIsDismissed(true); }} 
              className="text-slate-400 hover:text-slate-600 w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsHidden(true)} 
          className="bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 p-2.5 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 transition-colors"
          title="Hide AI Assistant"
        >
          <ChevronRight size={20} />
        </button>
        <button
          onClick={() => { setShowPopup(false); navigate('/assistant'); }}
          className="w-14 h-14 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110"
        >
          <span className="text-2xl">🍕</span>
        </button>
      </div>
    </div>
  );
}
