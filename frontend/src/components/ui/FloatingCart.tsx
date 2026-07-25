import { useCartStore } from '../../lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router';

export default function FloatingCart() {
  const { items, total } = useCartStore();
  const location = useLocation();

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  // Hide on tracking, checkout, cart, or order detail pages
  const p = location.pathname;
  const isHiddenPage = [
    '/cart',
    '/checkout',
    '/order-tracking',
    '/tracking',
    '/track',
    '/order-success',
    '/recheck-order',
    '/processing-order',
    '/order/',
    '/orders/',
    '/order-details',
    '/owner',
    '/delivery'
  ].some(prefix => p === prefix || p.startsWith(prefix));

  if (isHiddenPage) {
    return null;
  }

  return (
    <AnimatePresence>
      {cartCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.8, rotateX: 20 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
          exit={{ opacity: 0, y: 100, scale: 0.8, rotateX: -20 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="fixed z-40 bottom-[85px] left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-80 perspective-1000"
        >
          <Link 
            to="/cart"
            className="group relative flex items-center justify-between p-4 rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(249,115,22,0.4)] transition-all duration-300 hover:scale-[1.02] active:scale-95 overflow-hidden border border-white/20 bg-dark-900/60 backdrop-blur-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600/80 to-orange-500/80" />
            
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />

            <div className="flex flex-col relative z-10">
              <span className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Your Order</span>
              <div className="flex items-end gap-2">
                 <span className="text-2xl font-black text-white leading-none">₹{total}</span>
                 <span className="text-xs text-white/80 font-bold mb-1 bg-white/20 px-2 py-0.5 rounded-full">{cartCount} items</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-white text-primary-900 px-5 py-3 rounded-2xl font-black text-sm relative z-10 shadow-lg group-hover:shadow-xl transition-all">
              Checkout <ArrowRight className="w-4 h-4" />
            </div>
            
            <motion.div 
              id="cart-icon-target"
              className="absolute -top-3 -right-3 w-12 h-12 bg-dark-900 border-2 border-primary-500 text-primary-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)] rotate-12 group-hover:rotate-0 transition-transform duration-300 z-20"
              whileHover={{ scale: 1.1 }}
            >
              <ShoppingBag className="w-5 h-5" />
            </motion.div>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
