import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bike, ChefHat, Navigation, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../../lib/store';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useLiveOrderTracking } from '../../hooks/useLiveOrderTracking';

export default function FloatingOrderTracker() {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [activeOrder, setActiveOrder] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.uid) return;
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      where('status', 'in', ['pending', 'placed', 'accepted', 'preparing', 'ready', 'partner_assigned', 'picked_up', 'out_for_delivery'])
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setActiveOrder({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setActiveOrder(null);
      }
    });
    return () => unsub();
  }, [user, isAuthenticated]);

  const itemsSummary = React.useMemo(() => {
    if (!activeOrder?.items || !Array.isArray(activeOrder.items)) return '';
    return activeOrder.items.map((i: any) => typeof i === 'string' ? i : `${i.quantity || 1}× ${i.name || 'Item'}`).join(', ');
  }, [activeOrder?.items]);

  const stepMap: Record<string, number> = {
    pending: 1, accepted: 2, preparing: 3, ready: 4, partner_assigned: 5, picked_up: 5, out_for_delivery: 6, delivered: 7
  };

  useLiveOrderTracking(
    activeOrder
      ? {
          orderId: activeOrder.id,
          orderNumber: activeOrder.orderNumber || activeOrder.id?.slice(-6),
          status: activeOrder.status,
          step: stepMap[activeOrder.status] || 1,
          itemsSummary,
          totalAmount: Number(activeOrder.totalAmount || 0),
          etaMinutes: activeOrder.estimatedDeliveryMinutes || (activeOrder.eta ? parseInt(activeOrder.eta) : 25),
          etaText: activeOrder.eta ? String(activeOrder.eta) : undefined,
          riderName: activeOrder.deliveryPartnerName || '',
          riderPhone: activeOrder.deliveryPartnerPhone || '',
          restaurantName: 'Olive Pizza',
        }
      : null
  );

  const getStatusInfo = (status: string) => {
     switch (status) {
        case 'pending':
        case 'placed':
           return { title: 'Order Placed', icon: CheckCircle, color: 'text-amber-400', bg: 'bg-amber-500/20' };
        case 'accepted':
           return { title: 'Order Accepted', icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/20' };
        case 'preparing':
           return { title: 'Preparing Food', icon: ChefHat, color: 'text-orange-400', bg: 'bg-orange-500/20' };
        case 'ready':
           return { title: 'Order Ready', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
        case 'partner_assigned':
           return { title: 'Rider Assigned', icon: Bike, color: 'text-purple-400', bg: 'bg-purple-500/20' };
        case 'picked_up':
           return { title: 'Order Picked Up', icon: Bike, color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
        case 'out_for_delivery':
           return { title: 'On The Way', icon: Bike, color: 'text-primary-400', bg: 'bg-primary-500/20' };
        default:
           return { title: 'Track Order', icon: Navigation, color: 'text-white', bg: 'bg-white/10' };
     }
  };

  return (
    <AnimatePresence>
      {activeOrder && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-40 pointer-events-none"
        >
          <div
            onClick={() => navigate(`/order-tracking/${activeOrder.id}`)}
            className="w-full bg-slate-900/95 backdrop-blur-xl rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_25px_rgba(245,158,11,0.2)] border border-amber-500/30 flex flex-col pointer-events-auto cursor-pointer active:scale-[0.98] transition-transform overflow-hidden relative group"
          >
            {/* Ambient glowing top edge with animated sweep */}
            <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden rounded-t-3xl">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80 shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: "linear" }}
                className="w-1/2 h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-90 blur-[1px]"
              />
            </div>

            {/* Specular glass reflection overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none rounded-3xl" />

            <div className="flex items-center justify-between mb-3 relative z-10">
               <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border border-white/10 shadow-md ${getStatusInfo(activeOrder.status).bg}`}>
                     {React.createElement(getStatusInfo(activeOrder.status).icon, { className: `w-5 h-5 ${getStatusInfo(activeOrder.status).color}` })}
                  </div>
                  <div>
                     <p className="font-extrabold text-white text-sm tracking-tight group-hover:text-amber-300 transition-colors">
                       {getStatusInfo(activeOrder.status).title}
                     </p>
                     <p className="text-xs text-amber-200/70 font-medium">ETA: {activeOrder.eta || 'Calculating...'}</p>
                  </div>
               </div>
               <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm shadow-amber-500/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  Live
               </div>
            </div>
            
            {/* 3D Glowing Progress Bar */}
            <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-white/5 relative z-10">
               <motion.div 
                 initial={{ width: 0 }} 
                 animate={{
                   width: activeOrder.status === 'placed' || activeOrder.status === 'pending' ? '20%' :
                          activeOrder.status === 'accepted' ? '40%' :
                          activeOrder.status === 'preparing' ? '60%' :
                          activeOrder.status === 'ready' ? '80%' : '100%'
                 }}
                 transition={{ duration: 0.8, ease: "easeOut" }}
                 className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]"
               />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
