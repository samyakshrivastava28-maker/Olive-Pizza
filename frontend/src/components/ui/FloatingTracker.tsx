import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChefHat, Package, Truck, Clock } from 'lucide-react';

interface ActiveOrder {
  id: string;
  status: string;
  createdAt: string;
  totalAmount: number;
  items: any[];
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; emoji: string; color: string; bgColor: string }> = {
  pending: {
    icon: <Clock className="w-5 h-5" />,
    label: 'Waiting for Restaurant...',
    emoji: '⏳',
    color: 'text-amber-400',
    bgColor: 'from-amber-900/40 to-amber-900/20',
  },
  accepted: {
    icon: <ChefHat className="w-5 h-5" />,
    label: 'Order Confirmed',
    emoji: '✅',
    color: 'text-emerald-400',
    bgColor: 'from-emerald-500/20 to-emerald-600/10',
  },
  preparing: {
    icon: <ChefHat className="w-5 h-5" />,
    label: 'Baking Your Pizza',
    emoji: '🔥',
    color: 'text-orange-400',
    bgColor: 'from-orange-500/20 to-orange-600/10',
  },
  ready: {
    icon: <Package className="w-5 h-5" />,
    label: 'Ready for Pickup',
    emoji: '📦',
    color: 'text-blue-400',
    bgColor: 'from-blue-500/20 to-blue-600/10',
  },
  partner_assigned: {
    icon: <Package className="w-5 h-5" />,
    label: 'Packing Your Order',
    emoji: '🛍️',
    color: 'text-blue-400',
    bgColor: 'from-blue-500/20 to-blue-600/10',
  },
  picked_up: {
    icon: <Truck className="w-5 h-5" />,
    label: 'Order Picked Up',
    emoji: '🛵',
    color: 'text-violet-400',
    bgColor: 'from-violet-500/20 to-violet-600/10',
  },
  out_for_delivery: {
    icon: <Truck className="w-5 h-5" />,
    label: 'Out for Delivery',
    emoji: '🛵',
    color: 'text-primary-400',
    bgColor: 'from-primary-500/20 to-primary-600/10',
  },
};

export default function FloatingTracker() {
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Firestore real-time listener for active orders
  useEffect(() => {
    if (!auth.currentUser) return;

    const activeStatuses = ['pending', 'accepted', 'preparing', 'ready', 'partner_assigned', 'picked_up', 'out_for_delivery'];
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', auth.currentUser.uid),
      where('status', 'in', activeStatuses)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setActiveOrder(null);
        return;
      }
      // Take the most recent active order
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActiveOrder));
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setActiveOrder(orders[0]);
    });

    return () => unsub();
  }, [auth.currentUser?.uid]);

  // Fetch ETA from backend
  useEffect(() => {
    if (!activeOrder) return;
    if (activeOrder.status !== 'out_for_delivery' && activeOrder.status !== 'picked_up') {
      // Estimate ETA based on status
      if (activeOrder.status === 'pending') setEta(40);
      else if (activeOrder.status === 'accepted') setEta(35);
      else if (activeOrder.status === 'preparing') setEta(20);
      else if (activeOrder.status === 'ready' || activeOrder.status === 'partner_assigned') setEta(15);
      else setEta(null);
      return;
    }

    const fetchEta = async () => {
      try {
        const res = await fetch(`/api/tracking/order/${activeOrder.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.estimated_minutes) setEta(data.estimated_minutes);
        }
      } catch {}
    };
    fetchEta();
    const interval = setInterval(fetchEta, 8000);
    return () => clearInterval(interval);
  }, [activeOrder?.id, activeOrder?.status]);

  if (!activeOrder) return null;
  if (location.pathname.startsWith('/order-tracking') || location.pathname.startsWith('/order-success') || location.pathname.startsWith('/checkout')) return null;

  const config = STATUS_CONFIG[activeOrder.status];
  if (!config) return null;

  const isPending = activeOrder.status === 'pending';

  return (
    <AnimatePresence>
      <motion.div
        key={activeOrder.id}
        initial={{ y: 100, opacity: 0, scale: 0.9, rotateX: 20 }}
        animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
        exit={{ y: 100, opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[400px] z-[55] cursor-pointer perspective-1000"
        onClick={() => navigate(`/order-tracking/${activeOrder.id}`)}
      >
        <div className={`relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-r ${config.bgColor} backdrop-blur-2xl shadow-[0_30px_60px_rgba(0,0,0,0.6)]`}>
          {/* Animated Glassmorphism Shimmer */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
            animate={{ x: ['-200%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />

          <div className="relative p-5 flex items-center gap-4">
            {/* Animated Status Icon Container */}
            <div className="relative shrink-0">
              <motion.div
                animate={isPending ? { scale: [1, 1.05, 1], rotate: [0, -5, 5, 0] } : { scale: [1, 1.15, 1] }}
                transition={{ duration: isPending ? 1.5 : 2, repeat: Infinity, ease: 'easeInOut' }}
                className={`w-14 h-14 rounded-2xl backdrop-blur-xl border border-white/20 flex items-center justify-center text-3xl shadow-inner ${isPending ? 'bg-amber-500/20' : 'bg-dark-900/60'}`}
              >
                {config.emoji}
              </motion.div>
              {/* Pulse ring for pending/active */}
              <motion.div
                className={`absolute -inset-1.5 rounded-2xl border-2 ${isPending ? 'border-amber-400/40' : 'border-white/20'}`}
                animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              {/* Floating dots if pending */}
              {isPending && (
                <div className="absolute -top-1 -right-1 flex gap-0.5 bg-dark-950 px-1.5 py-0.5 rounded-full border border-white/10">
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1 h-1 bg-amber-400 rounded-full" />
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-amber-400 rounded-full" />
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-amber-400 rounded-full" />
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className={`text-[15px] font-black tracking-wide ${config.color}`}>
                {isPending ? 'Please wait...' : config.label}
              </p>
              <p className="text-[13px] text-slate-300 mt-1 font-medium truncate">
                {isPending ? 'Restaurant is reviewing your order' : 'Olive Pizza • ' + (activeOrder.items?.length || 0) + ' items'}
              </p>
            </div>

            {/* ETA + CTA */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {eta && !isPending && (
                <div className="flex items-center gap-1.5 text-white bg-dark-950/50 px-2 py-1 rounded-lg border border-white/5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-sm font-black">{eta} min</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-xs font-bold transition-colors">
                <MapPin className="w-3.5 h-3.5" />
                Track
              </div>
            </div>
          </div>

          {/* Animated Progress Bar */}
          {!isPending && (
            <div className="h-1.5 bg-dark-900/60 overflow-hidden relative">
              <motion.div
                className="h-full bg-gradient-to-r from-primary-600 via-primary-400 to-primary-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] relative"
                initial={{ width: '0%' }}
                animate={{
                  width: activeOrder.status === 'accepted' ? '16%' :
                         activeOrder.status === 'preparing' ? '33%' :
                         activeOrder.status === 'ready' || activeOrder.status === 'partner_assigned' ? '50%' :
                         activeOrder.status === 'picked_up' ? '66%' :
                         activeOrder.status === 'out_for_delivery' ? '83%' : '100%'
                }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              >
                {/* Progress bar shimmer */}
                <motion.div
                  className="absolute top-0 bottom-0 left-0 w-20 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  animate={{ x: ['-100%', '400%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
