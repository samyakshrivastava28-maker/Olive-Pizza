import { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Bell, CheckCircle, PackageOpen, AlertTriangle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function OwnerNotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen to recent orders for status changes
    const q = query(collection(db, 'orders'), orderBy('updatedAt', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recentActivity = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          status: data.status,
          updatedAt: data.updatedAt,
          totalAmount: data.totalAmount
        };
      });
      setNotifications(recentActivity);
      setUnreadCount(recentActivity.filter((n: any) => n.status === 'pending').length);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Bell className="w-5 h-5 text-orange-500" />;
      case 'partner_assigned': return <PackageOpen className="w-5 h-5 text-blue-500" />;
      case 'delivered': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  const getMessage = (status: string, id: string) => {
    const shortId = id.slice(-6).toUpperCase();
    switch (status) {
      case 'pending': return `New order #${shortId} received`;
      case 'partner_assigned': return `Partner assigned to #${shortId}`;
      case 'delivered': return `Order #${shortId} delivered successfully`;
      case 'cancelled': return `Order #${shortId} was cancelled`;
      default: return `Order #${shortId} status updated to ${status.replace('_', ' ')}`;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-300 hover:text-white transition-colors bg-white/5 rounded-full hover:bg-white/10"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-[#1E293B] flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-4 w-80 md:w-96 bg-[#1E293B] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[200]"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0B0F14]/50">
              <h3 className="font-bold text-white">Notifications</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-500 font-medium">
                  No recent activity
                </div>
              ) : (
                notifications.map((notif, i) => (
                  <div key={`${notif.id}-${i}`} className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors flex gap-4 items-start">
                    <div className="mt-1 bg-[#0B0F14] p-2 rounded-full border border-white/5">
                      {getIcon(notif.status)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-200">{getMessage(notif.status, notif.id)}</p>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs font-bold text-primary-400">₹{notif.totalAmount}</p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(notif.updatedAt || Date.now()).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 text-center border-t border-white/10 bg-[#0B0F14]/30">
              <a href="/owner/orders" className="text-xs font-bold text-primary-500 hover:text-primary-400 uppercase tracking-wider">
                View All Activity
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
