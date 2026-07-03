import { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/glass/GlassSystem';
import { Bell, MapPin, Package, CheckCircle, Navigation, Info, Clock, AlertTriangle } from 'lucide-react';
import { useAuthStore } from "../../lib/store";
import { db } from "../../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Order } from "../../types/models";
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationItem {
  id: string;
  title: string;
  details: string;
  time: string;
  status: 'pending' | 'accepted' | 'completed';
}

export default function DeliveryNotificationCenter() {
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'completed'>('all');
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "orders"),
      where("deliveryPartnerId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveOrders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
      liveOrders.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      setOrders(liveOrders);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const assignedCount = orders.filter(o => o.status === 'partner_assigned' || o.status === 'ready').length;
  const activeCount = orders.filter(o => o.status === 'picked_up' || o.status === 'out_for_delivery').length;
  const completedCount = orders.filter(o => o.status === 'delivered').length;

  const notifications: NotificationItem[] = orders.map(order => {
    let title = 'Order Update';
    let details = `${order.dailyOrderNumber || `Order #${order.id?.slice(0, 5)}`}`;
    let status: 'pending' | 'accepted' | 'completed' = 'pending';

    if (order.status === 'partner_assigned' || order.status === 'ready') {
      title = 'New Delivery Assigned';
      details = `Order for ${order.customerInfo?.name || 'Customer'}. Tap to review and accept.`;
      status = 'pending';
    } else if (order.status === 'picked_up' || order.status === 'out_for_delivery') {
      title = 'Out for Delivery';
      details = `Dropoff at: ${order.deliveryAddress?.addressLine || 'Customer address'}`;
      status = 'accepted';
    } else if (order.status === 'delivered') {
      title = 'Delivery Completed';
      details = `${order.dailyOrderNumber || `Order #${order.id?.slice(0, 5)}`} delivered successfully. Earnings added to your wallet.`;
      status = 'completed';
    }

    const dateObj = order.updatedAt ? new Date(order.updatedAt) : new Date(order.createdAt || Date.now());
    const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      id: order.id || Math.random().toString(),
      title,
      details,
      time,
      status
    };
  });

  const filtered = notifications.filter(n => filter === 'all' || n.status === filter);

  return (
    <div className="bg-dark-950 min-h-[100dvh] text-slate-200 pb-24 font-sans px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-white flex items-center gap-2"><Bell className="text-blue-500"/> Notifications</h1>
          <button className="text-sm font-bold text-slate-400 hover:text-white bg-dark-800 px-3 py-1 rounded-full border border-dark-700">Mark all read</button>
        </div>

        {/* Summary Boxes */}
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="p-4 flex flex-col items-center justify-center text-center border-t-2 border-t-amber-500 bg-gradient-to-b from-amber-500/10 to-transparent">
            <Package className="w-6 h-6 text-amber-400 mb-1" />
            <div className="text-2xl font-black text-white">{assignedCount}</div>
            <div className="text-[10px] text-amber-400/80 uppercase tracking-wider font-bold">Assigned</div>
          </GlassCard>
          <GlassCard className="p-4 flex flex-col items-center justify-center text-center border-t-2 border-t-blue-500 bg-gradient-to-b from-blue-500/10 to-transparent">
            <Navigation className="w-6 h-6 text-blue-400 mb-1" />
            <div className="text-2xl font-black text-white">{activeCount}</div>
            <div className="text-[10px] text-blue-400/80 uppercase tracking-wider font-bold">Active</div>
          </GlassCard>
          <GlassCard className="p-4 flex flex-col items-center justify-center text-center border-t-2 border-t-green-500 bg-gradient-to-b from-green-500/10 to-transparent">
            <CheckCircle className="w-6 h-6 text-green-400 mb-1" />
            <div className="text-2xl font-black text-white">{completedCount}</div>
            <div className="text-[10px] text-green-400/80 uppercase tracking-wider font-bold">Completed</div>
          </GlassCard>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['all', 'pending', 'accepted', 'completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold capitalize transition-all border ${filter === f ? 'bg-primary-500 text-white border-primary-400 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-dark-800 text-slate-400 border-dark-700 hover:text-white'}`}
            >
              {f} {f !== 'all' && `(${f === 'pending' ? assignedCount : f === 'accepted' ? activeCount : completedCount})`}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">All caught up!</h3>
                <p className="text-slate-500 text-sm">No new notifications in this category.</p>
              </motion.div>
            ) : (
              filtered.map((n, i) => (
                <motion.div 
                  key={n.id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: i * 0.05 }}
                  className={`p-4 rounded-[24px] border relative overflow-hidden ${
                    n.status === 'pending' ? 'bg-amber-500/5 border-amber-500/20' : 
                    n.status === 'completed' ? 'bg-green-500/5 border-green-500/20' : 
                    'bg-blue-500/5 border-blue-500/20'
                  }`}
                >
                  {n.status === 'pending' && <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-[100px]" />}
                  <div className="flex items-start gap-4 relative z-10">
                    <div className={`p-3 rounded-full mt-1 shrink-0 ${
                      n.status === 'pending' ? 'bg-amber-500/20 text-amber-500' : 
                      n.status === 'completed' ? 'bg-green-500/20 text-green-500' : 
                      'bg-blue-500/20 text-blue-500'
                    }`}>
                      {n.status === 'pending' ? <AlertTriangle className="w-5 h-5" /> : 
                       n.status === 'completed' ? <CheckCircle className="w-5 h-5" /> : 
                       <MapPin className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-white text-[15px]">{n.title}</h3>
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Clock size={10}/> {n.time}</span>
                      </div>
                      <p className="text-sm text-slate-400 font-medium leading-relaxed">
                        {n.details}
                      </p>
                      {n.status === 'pending' && (
                        <div className="mt-3 flex gap-2">
                          <button className="bg-amber-500 text-dark-950 text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">View Order</button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
