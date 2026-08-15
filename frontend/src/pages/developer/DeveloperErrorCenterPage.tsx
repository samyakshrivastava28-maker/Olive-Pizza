import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, RefreshCw, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { devGet, devPost } from '../../lib/devopsApi';
import { DevErrorBoundary } from '../../components/developer/DevUI';

export default function DeveloperErrorCenterPage() {
  const [errorsList, setErrorsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNRESOLVED' | 'RESOLVED'>('ALL');
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const fetchErrors = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await devGet(`/error-center?status=${statusFilter}`, signal);
      if (res.aborted) return;
      if (res.success && res.data) {
        setErrorsList(res.data.errors || res.data || []);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast.error('Failed to load error logs');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    fetchErrors(controller.signal);
    return () => controller.abort();
  }, [fetchErrors]);

  const handleResolve = async (errorId: number) => {
    setResolvingId(errorId);
    try {
      const res = await devPost(`/error-center/resolve/${errorId}`);
      if (res.success) {
        toast.success('Exception marked as resolved');
        fetchErrors();
      } else {
        toast.error(res.error || 'Failed to resolve error');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <DevErrorBoundary pageTitle="Error Operations Center">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              Platform Exception & Error Center
            </h1>
            <p className="text-slate-400 text-xs mt-1">Automatic root cause categorization, suggested remediation fixes, and stack trace inspection.</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="bg-black/40 border border-white/10 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-primary-500"
            >
              <option value="ALL">Status: All</option>
              <option value="UNRESOLVED">Unresolved Only</option>
              <option value="RESOLVED">Resolved Only</option>
            </select>
            <button
              onClick={() => fetchErrors()}
              disabled={loading}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : errorsList.length > 0 ? (
          <div className="space-y-4">
            {errorsList.map((err) => (
              <motion.div
                key={err.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/60 border border-red-500/20 rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 border border-red-500/30 text-red-400 uppercase tracking-wide">
                      {err.rootCauseCategory || 'System Exception'}
                    </span>
                    {err.is_resolved && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/15 border border-green-500/30 text-green-400">
                        Resolved
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500 text-xs">{err.createdAt ? new Date(err.createdAt).toLocaleString() : ''}</span>
                </div>

                <p className="text-white text-sm font-semibold">{err.errorMessage}</p>

                {err.suggestedFix && (
                  <div className="bg-black/40 border border-white/5 p-3 rounded-xl text-xs text-green-300 font-mono">
                    💡 Suggested Remediation: {err.suggestedFix}
                  </div>
                )}

                {err.stackTrace && (
                  <details className="text-xs text-slate-400">
                    <summary className="cursor-pointer hover:text-slate-200">View Stack Trace</summary>
                    <pre className="mt-2 p-3 bg-black/50 border border-white/5 rounded-xl text-[11px] font-mono overflow-x-auto text-slate-300 leading-relaxed">
                      {err.stackTrace}
                    </pre>
                  </details>
                )}

                {!err.is_resolved && (
                  <div className="pt-2 border-t border-white/5 flex justify-end">
                    <button
                      onClick={() => handleResolve(err.id)}
                      disabled={resolvingId === err.id}
                      className="px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {resolvingId === err.id ? 'Resolving...' : 'Mark as Resolved'}
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-white/5 text-slate-500 text-sm">
            Zero system exceptions recorded. All services operating normally.
          </div>
        )}
      </div>
    </DevErrorBoundary>
  );
}
