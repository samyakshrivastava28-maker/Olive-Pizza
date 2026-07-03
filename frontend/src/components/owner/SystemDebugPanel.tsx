import { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/store';
import { auth } from '../../lib/firebase';
import { Activity, Server, Database, Cloud, Zap, AlertTriangle, CheckCircle2, RotateCcw, Clock } from 'lucide-react';

export const SystemDebugPanel = () => {
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDebugInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/system/debug', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch diagnostics');
      const json = await res.json();
      setDebugData(json.diagnostics);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center justify-between mt-6">
        <div className="flex items-center gap-3 text-red-500">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-semibold text-sm">{error}</span>
        </div>
        <button onClick={fetchDebugInfo} className="px-3 py-1 bg-red-500/20 rounded-md text-red-400 text-xs font-bold uppercase hover:bg-red-500/30">Retry</button>
      </div>
    );
  }

  if (!debugData || loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-xl animate-pulse mt-6">
        <div className="h-6 w-48 bg-slate-700 rounded mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-20 bg-slate-700 rounded"></div>
          <div className="h-20 bg-slate-700 rounded"></div>
          <div className="h-20 bg-slate-700 rounded"></div>
          <div className="h-20 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  const { system, services, timestamp } = debugData;

  const StatusItem = ({ label, service, icon: Icon }: any) => {
    const isOk = service.status === 'connected';
    return (
      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between group hover:border-slate-700 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isOk ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-0.5">{label}</div>
            <div className="text-white font-medium text-sm">{isOk ? 'Operational' : service.message || 'Error'}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-slate-500 text-xs font-mono">{service.latency}ms</div>
          {service.connections !== undefined && (
            <div className="text-slate-600 text-[10px] uppercase font-bold mt-1">{service.connections} Conn</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mt-6">
      <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-400" />
          <h3 className="text-white font-bold">System Diagnostics</h3>
          <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">Developer Mode</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-slate-500 text-xs font-mono flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(timestamp).toLocaleTimeString()}
          </div>
          <button 
            onClick={fetchDebugInfo}
            className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors"
            title="Refresh Diagnostics"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800/50">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Heap Used</div>
            <div className="text-xl font-bold text-white">{Math.round(system.memory.heapUsed / 1024 / 1024)} MB</div>
          </div>
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800/50">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Heap Total</div>
            <div className="text-xl font-bold text-white">{Math.round(system.memory.heapTotal / 1024 / 1024)} MB</div>
          </div>
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800/50">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">CPU Load (1m)</div>
            <div className="text-xl font-bold text-white">{system.loadAvg[0].toFixed(2)}</div>
          </div>
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800/50">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Uptime</div>
            <div className="text-xl font-bold text-white">{Math.floor(system.uptime / 3600)}h {Math.floor((system.uptime % 3600)/60)}m</div>
          </div>
        </div>

        <div className="space-y-3">
          <StatusItem label="PostgreSQL Database" service={services.database} icon={Database} />
          <StatusItem label="Firebase Admin" service={services.firebase} icon={Server} />
          <StatusItem label="Cloudinary CDN" service={services.cloudinary} icon={Cloud} />
        </div>
      </div>
    </div>
  );
};
