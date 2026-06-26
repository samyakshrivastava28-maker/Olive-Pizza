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
  accepted: {
    icon: <ChefHat className="w-5 h-5" />,
    label: 'Order Accepted',
    emoji: '✅',
    color: 'text-emerald-400',
    bgColor: 'from-emerald-500/20 to-emerald-600/10',
  },
  preparing: {
    icon: <ChefHat className="w-5 h-5" />,
    label: 'Being Prepared',
    emoji: '🍳',
    color: 'text-amber-400',
    bgColor: 'from-amber-500/20 to-orange-600/10',
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
    emoji: '📦',
    color: 'text-blue-400',
    bgColor: 'from-blue-500/20 to-blue-600/10',
  },
  picked_up: {
    icon: <Truck className="w-5 h-5" />,
    label: 'Picked Up',
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

    const activeStatuses = ['accepted', 'preparing', 'ready', 'partner_assigned', 'picked_up', 'out_for_delivery'];
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

  // Fetch ETA from backend when out_for_delivery
  useEffect(() => {
    if (!activeOrder || activeOrder.status !== 'out_for_delivery') {
      // Estimate ETA based on status
      if (activeOrder?.status === 'accepted') setEta(25);
      else if (activeOrder?.status === 'preparing') setEta(18);
      else if (activeOrder?.status === 'ready' || activeOrder?.status === 'partner_assigned') setEta(12);
      else if (activeOrder?.status === 'picked_up') setEta(8);
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
  if (location.pathname.startsWith('/order-tracking')) return null;

  const config = STATUS_CONFIG[activeOrder.status];
  if (!config) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[380px] z-[55] cursor-pointer"
        onClick={() => navigate(`/order-tracking/${activeOrder.id}`)}
      >
        <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r ${config.bgColor} backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]`}>
          {/* Animated shimmer */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />

          <div className="relative p-4 flex items-center gap-4">
            {/* Animated status icon */}
            <div className="relative shrink-0">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-12 h-12 rounded-xl bg-dark-900/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-2xl"
              >
                {config.emoji}
              </motion.div>
              {/* Pulse ring */}
              <motion.div
                className="absolute -inset-1 rounded-xl border-2 border-white/20"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-black ${config.color}`}>
                {config.label}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {activeOrder.items?.length || 0} item{(activeOrder.items?.length || 0) !== 1 ? 's' : ''} • ₹{activeOrder.totalAmount}
              </p>
            </div>

            {/* ETA + Track Button */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              {eta && (
                <div className="flex items-center gap-1 text-white">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-sm font-black">{eta} min</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-primary-400 text-xs font-bold">
                <MapPin className="w-3 h-3" />
                Track
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-dark-900/50">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-400"
              initial={{ width: '0%' }}
              animate={{
                width: activeOrder.status === 'accepted' ? '16%' :
                       activeOrder.status === 'preparing' ? '33%' :
                       activeOrder.status === 'ready' || activeOrder.status === 'partner_assigned' ? '50%' :
                       activeOrder.status === 'picked_up' ? '66%' :
                       activeOrder.status === 'out_for_delivery' ? '83%' : '100%'
              }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
