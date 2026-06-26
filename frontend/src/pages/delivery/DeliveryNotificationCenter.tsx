import { useState } from 'react';
import { GlassCard } from '../../components/ui/glass/GlassSystem';
import { Bell, MapPin, Package, CheckCircle, Navigation } from 'lucide-react';

const MOCK_NOTIFICATIONS = [
  { id: '1', title: 'Delivery Assigned', details: 'Order for John - 2.5 km away', time: '10 mins ago', status: 'accepted', stage: 'delivery_assigned' },
  { id: '2', title: 'Pick up from Restaurant', details: 'Olive Pizza Main St', time: '8 mins ago', status: 'pending', stage: 'navigate_restaurant' },
  { id: '3', title: 'Out for Delivery', details: '123 Customer Ave', time: 'Yesterday', status: 'completed', stage: 'start_delivery' },
];

export default function DeliveryNotificationCenter() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'completed'>('all');
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const filtered = notifications.filter(n => filter === 'all' || n.status === filter);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-black text-white">Notification Center</h1>
        <p className="text-slate-400">Manage your assigned orders and delivery notifications.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <GlassCard className="p-4 flex flex-col items-center justify-center text-center">
          <Package className="w-8 h-8 text-blue-400 mb-2" />
          <div className="text-2xl font-black text-white">12</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Assigned</div>
        </GlassCard>
        <GlassCard className="p-4 flex flex-col items-center justify-center text-center border-b-4 border-amber-500">
          <Navigation className="w-8 h-8 text-amber-400 mb-2" />
          <div className="text-2xl font-black text-amber-400">1</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Active</div>
        </GlassCard>
        <GlassCard className="p-4 flex flex-col items-center justify-center text-center">
          <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
          <div className="text-2xl font-black text-white">10</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Completed</div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="flex gap-2 mb-6">
          {['all', 'pending', 'accepted', 'completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-colors ${filter === f ? 'bg-primary-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filtered.map(n => (
            <div key={n.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-white/5">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${n.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : n.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {n.status === 'pending' ? <Bell className="w-5 h-5" /> : n.status === 'completed' ? <CheckCircle className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{n.title}</h3>
                  <div className="text-sm text-slate-400">
                    {n.details}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {n.time}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${n.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : n.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {n.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
