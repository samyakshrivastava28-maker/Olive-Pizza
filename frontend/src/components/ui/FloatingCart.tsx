import { useCartStore } from '../../lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router';

export default function FloatingCart() {
  const { items, total } = useCartStore();
  const location = useLocation();

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  // Hide on checkout, cart, or dashboard pages
  if (location.pathname === '/cart' || location.pathname === '/checkout' || location.pathname.startsWith('/owner') || location.pathname.startsWith('/delivery')) {
    return null;
  }

  return (
    <AnimatePresence>
      {cartCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed z-40 bottom-[80px] left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-80"
        >
          <Link 
            to="/cart"
            className="flex items-center justify-between bg-primary-600 hover:bg-primary-500 text-white p-4 rounded-2xl shadow-2xl shadow-primary-500/20 transition-colors"
          >
            <div className="flex flex-col">
              <span className="text-sm font-bold text-primary-100 uppercase tracking-wider">{cartCount} Item{cartCount > 1 ? 's' : ''}</span>
              <span className="text-xl font-black">₹{total}</span>
            </div>
            
            <div className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-xl transition-colors font-bold">
              View Cart <ArrowRight className="w-5 h-5" />
            </div>
            
            <motion.div 
              id="cart-icon-target"
              className="absolute -top-3 -right-3 w-10 h-10 bg-dark-900 border-2 border-primary-500 text-primary-500 rounded-full flex items-center justify-center shadow-lg"
              whileHover={{ scale: 1.1, rotate: 10 }}
            >
              <ShoppingBag className="w-5 h-5" />
            </motion.div>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
