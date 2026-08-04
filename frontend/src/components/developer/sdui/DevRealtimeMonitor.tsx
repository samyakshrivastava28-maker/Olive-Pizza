import React from 'react';
import { Activity, Zap, CheckCircle2 } from 'lucide-react';
import { useWebsiteConfigStore } from '../../../stores/websiteConfigStore';

export const DevRealtimeMonitor: React.FC = () => {
  const syncLogs = useWebsiteConfigStore((state) => state.syncLogs);
  const isSubscribed = useWebsiteConfigStore((state) => state.isSubscribed);

  return (
    <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          Realtime Firestore Sync Stream
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isSubscribed ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'
            }`}
          />
          <span className="text-xs text-slate-400 font-mono">
            {isSubscribed ? 'LISTENER ACTIVE' : 'DISCONNECTED'}
          </span>
        </div>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-xs">
        {syncLogs.length > 0 ? (
          syncLogs.map((log, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-slate-950/80 border border-white/5 flex items-center justify-between text-slate-300"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-primary-400">{log.collection}</span>
                <span>/</span>
                <span className="text-white">{log.docId}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                <span>{log.latencyMs}ms</span>
                <span>{log.timestamp}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            Listening for real-time document change events...
          </div>
        )}
      </div>
    </div>
  );
};
export default DevRealtimeMonitor;
