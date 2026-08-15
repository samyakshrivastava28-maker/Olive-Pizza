import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, RefreshCw, Search, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { devGet } from '../../lib/devopsApi';
import { StatusPill, DevErrorBoundary } from '../../components/developer/DevUI';

export default function DeveloperAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchAuditLogs = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await devGet(`/audit-logs?limit=100&search=${encodeURIComponent(search)}`, signal);
      if (res.aborted) return;
      if (res.success && res.data) {
        setLogs(res.data.logs || res.data || []);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast.error('Failed to load audit logs');
      }
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAuditLogs(controller.signal);
    return () => controller.abort();
  }, [fetchAuditLogs]);

  return (
    <DevErrorBoundary pageTitle="Audit Trail">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 text-primary-400" />
              Immutable Developer Action Audit Trail
            </h1>
            <p className="text-slate-400 text-xs mt-1">Cryptographic & database record of all developer actions, schema adjustments, and mutation events.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search audit trail..."
                className="bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
              />
            </div>
            <button
              onClick={() => fetchAuditLogs()}
              disabled={loading}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : logs.length > 0 ? (
          <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl overflow-hidden divide-y divide-white/5">
            {logs.map((log: any, idx: number) => (
              <motion.div
                key={log.id || idx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-primary-400 font-mono font-bold text-xs">{log.action_type || log.action}</span>
                    <span className="text-slate-400 text-xs font-mono">[{log.target_module || log.module || 'system'}]</span>
                    <StatusPill status={log.status || 'SUCCESS'} />
                  </div>
                  <p className="text-slate-300 text-xs flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>By: <strong className="text-white">{log.developer_email || log.email || 'webhub2811@gmail.com'}</strong></span>
                    {log.ip_address && <span className="text-slate-500 font-mono">• IP: {log.ip_address}</span>}
                  </p>
                  {log.details && (
                    <p className="text-[11px] text-slate-400 font-mono mt-1 bg-black/30 p-1.5 rounded-lg">
                      {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                    </p>
                  )}
                </div>
                <span className="text-slate-500 text-xs shrink-0 font-mono">
                  {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                </span>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-white/5 text-slate-500 text-sm">
            No developer audit logs found matching criteria.
          </div>
        )}
      </div>
    </DevErrorBoundary>
  );
}
