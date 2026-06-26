import { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/glass/GlassSystem';
import { Bell, Clock, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

// Mock data for UI layout
const MOCK_NOTIFICATIONS = [
  { id: '1', title: 'New Order: John Doe', time: '2 mins ago', status: 'pending', stage: 'new_order' },
  { id: '2', title: 'Cooking Control: Jane Smith', time: '15 mins ago', status: 'accepted', stage: 'kitchen_control' },
  { id: '3', title: 'Driver Assigned: Mike', time: '1 hour ago', status: 'completed', stage: 'delivery_assigned' },
  { id: '4', title: 'Driver Arrived: Mike', time: '2 hours ago', status: 'completed', stage: 'arrived_customer' },
];

export default function OwnerNotificationCenter() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const filtered = notifications.filter(n => filter === 'all' || n.status === filter);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-black text-white">Notification Center</h1>
        <p className="text-slate-400">View notification history, active alarms, and retry failed pushes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex flex-col items-center justify-center text-center">
          <Bell className="w-8 h-8 text-blue-400 mb-2" />
          <div className="text-2xl font-black text-white">124</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total Sent Today</div>
        </GlassCard>
        <GlassCard className="p-4 flex flex-col items-center justify-center text-center border-b-4 border-amber-500">
          <Clock className="w-8 h-8 text-amber-400 mb-2" />
          <div className="text-2xl font-black text-amber-400">2</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Active Alarms</div>
        </GlassCard>
        <GlassCard className="p-4 flex flex-col items-center justify-center text-center">
          <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
          <div className="text-2xl font-black text-white">118</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Delivered</div>
        </GlassCard>
        <GlassCard className="p-4 flex flex-col items-center justify-center text-center border-b-4 border-red-500">
          <XCircle className="w-8 h-8 text-red-400 mb-2" />
          <div className="text-2xl font-black text-red-400">4</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Failed / Retrying</div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="flex gap-2 mb-6">
          {['all', 'pending', 'completed', 'failed'].map(f => (
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
                <div className={`p-3 rounded-full ${n.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : n.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{n.title}</h3>
                  <div className="text-sm text-slate-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> {n.time} • Stage: {n.stage}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${n.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : n.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {n.status}
                </span>
                {n.status === 'failed' && (
                  <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors" title="Retry Push">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
