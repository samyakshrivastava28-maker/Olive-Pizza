import React, { useEffect, useState } from 'react';
import { Activity, Database, Users, HardDrive, Clock, Server } from 'lucide-react';
import toast from 'react-hot-toast';

export const SystemHealthPanel = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/health/metrics', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to fetch health metrics', err);
      toast.error('Failed to connect to health monitor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-4 bg-slate-900 rounded-xl animate-pulse h-32" />;

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border border-slate-800">
      <div className="flex items-center gap-2 mb-6">
        <Server className="w-5 h-5 text-emerald-400" />
        <h2 className="text-lg font-bold text-white">System Health & Live Metrics</h2>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Clock className="w-4 h-4" />
              Uptime
            </div>
            <div className="text-xl font-bold text-white">{formatUptime(metrics.uptime)}</div>
          </div>
          
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <HardDrive className="w-4 h-4" />
              DB Size
            </div>
            <div className="text-xl font-bold text-white">{metrics.dbSize}</div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Users className="w-4 h-4" />
              Active Users
            </div>
            <div className="text-xl font-bold text-emerald-400">{metrics.activeUsers}</div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Activity className="w-4 h-4" />
              Deliveries
            </div>
            <div className="text-xl font-bold text-blue-400">{metrics.activeDeliveries}</div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Database className="w-4 h-4" />
              Queue Size
            </div>
            <div className="text-xl font-bold text-amber-400">{metrics.notificationQueueSize}</div>
          </div>
          
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Server className="w-4 h-4" />
              Memory
            </div>
            <div className="text-xl font-bold text-white">{Math.round(metrics.memory.heapUsed / 1024 / 1024)} MB</div>
          </div>
        </div>
      )}
    </div>
  );
};
