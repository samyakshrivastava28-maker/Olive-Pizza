import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router';
import { useCartStore } from '../lib/store';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export default function AIAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const cartStore = useCartStore();
  
  const [isHidden, setIsHidden] = useState(false);

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
    <div className={`fixed right-4 md:right-6 z-[60] flex flex-col items-end gap-2 transition-all duration-300 ${isCartVisible ? 'bottom-[160px]' : 'bottom-20'} md:bottom-6 opacity-100 translate-y-0`}>
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsHidden(true)} 
          className="bg-dark-900/80 backdrop-blur text-slate-400 hover:text-white p-2.5 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10 transition-colors"
          title="Hide AI Assistant"
        >
          <ChevronRight size={20} />
        </button>
        <button
          onClick={() => navigate('/assistant')}
          className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white rounded-full shadow-[0_0_20px_rgba(249,115,22,0.4)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
        >
          <span className="text-2xl group-hover:animate-bounce-short">🍕</span>
        </button>
      </div>
    </div>
  );
}
