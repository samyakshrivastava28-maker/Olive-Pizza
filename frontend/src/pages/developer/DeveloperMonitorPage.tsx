import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Zap, RefreshCw, CheckCircle2, XCircle, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { devGet } from '../../lib/devopsApi';
import { StatusPill, DevErrorBoundary } from '../../components/developer/DevUI';

export default function DeveloperMonitorPage() {
  const [monitorData, setMonitorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchMonitor = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await devGet('/notifications/pipeline-monitor?limit=100', signal);
      if (res.aborted) return;
      if (res.success && res.data) {
        setMonitorData(res.data);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast.error('Failed to fetch notification pipeline monitor');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchMonitor(controller.signal);
    return () => controller.abort();
  }, [fetchMonitor]);

  const filteredLogs = (monitorData?.logs || []).filter((log: any) => {
    if (roleFilter !== 'all' && (log.recipientRole || log.role) !== roleFilter) return false;
    if (sourceFilter !== 'all' && log.triggerSource !== sourceFilter) return false;
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    return true;
  });

  return (
    <DevErrorBoundary pageTitle="Pipeline Monitor">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <Zap className="w-6 h-6 text-primary-400" />
              Live Notification Pipeline Monitor
            </h1>
            <p className="text-slate-400 text-xs mt-1">Real-time inspection of active dispatch workers, latency timings, and delivery outcomes.</p>
          </div>
          <button
            onClick={() => fetchMonitor()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition-all disabled:opacity-60 shrink-0 cursor-pointer shadow-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Monitor
          </button>
        </div>

        {/* Filters */}
        <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-4 flex flex-wrap gap-3 items-center">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Filters:</span>

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-black/40 border border-white/10 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary-500"
          >
            <option value="all">Role: All</option>
            <option value="owner">Owner / Admin</option>
            <option value="customer">Customer</option>
            <option value="delivery">Delivery Partner</option>
          </select>

          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="bg-black/40 border border-white/10 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary-500"
          >
            <option value="all">Source: All</option>
            <option value="manual">Manual Broadcast</option>
            <option value="automatic">Automatic Event</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-black/40 border border-white/10 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary-500"
          >
            <option value="all">Result: All</option>
            <option value="success">Success</option>
            <option value="failure">Failed</option>
          </select>

          <span className="text-slate-500 text-xs ml-auto font-mono">
            {filteredLogs.length} events
          </span>
        </div>

        {/* Event List */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="space-y-3">
            {filteredLogs.map((log: any, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-1 shrink-0">
                    {log.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                        log.triggerSource === 'manual'
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                      }`}>
                        {log.triggerSource || 'automatic'}
                      </span>

                      <span className="text-white font-semibold text-sm truncate">
                        {log.eventType || log.payload?.data?.stage || log.payload?.data?.category || 'Notification Event'}
                      </span>

                      {log.orderId && (
                        <span className="bg-white/5 border border-white/10 text-primary-300 font-mono text-xs px-2 py-0.5 rounded-md">
                          Order #{log.orderId.slice(-6).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400 text-xs mt-1">
                      <span>User: <strong className="text-slate-200">{log.userId || 'Bulk'}</strong></span>
                      {log.recipientRole && <span>Role: <strong className="text-slate-200">{log.recipientRole}</strong></span>}
                      {log.elapsedTimeMs > 0 && <span>Latency: <strong className="text-slate-200 font-mono">{log.elapsedTimeMs}ms</strong></span>}
                      {log.timestamp && <span className="text-slate-500 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>}
                    </div>

                    {log.errorDetails && (
                      <p className="text-red-400 text-xs mt-2 bg-red-500/10 border border-red-500/20 p-2 rounded-lg font-mono">
                        Error: {log.errorDetails}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                  <StatusPill status={log.status} />
                  {log.retryReason && (
                    <span className="text-red-400/80 text-[10px] font-mono">
                      Reason: {log.retryReason}
                    </span>
                  )}
                  <span className="text-slate-500 text-[10px] font-mono truncate max-w-[180px]">
                    Token: {log.fcmToken ? `${log.fcmToken.slice(0, 12)}...` : 'None'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-white/5 text-slate-500 text-sm">
            No pipeline events recorded matching the selected filter criteria.
          </div>
        )}
      </div>
    </DevErrorBoundary>
  );
}
