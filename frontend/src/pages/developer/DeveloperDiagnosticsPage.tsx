import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, RefreshCw, CheckCircle2, ChevronDown, ChevronRight, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { devGet } from '../../lib/devopsApi';
import { StatusPill, CopyButton, SectionTitle, DevErrorBoundary } from '../../components/developer/DevUI';

function ExpandableQueueRow({ item }: { item: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 py-3 px-4 hover:bg-white/[0.03] transition-colors text-left"
      >
        {open ? <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />}
        <StatusPill status={item.status} />
        <span className="text-slate-300 text-xs font-mono truncate flex-1">{item.id}</span>
        <span className="text-slate-500 text-xs">{item.category}</span>
        <span className="text-slate-500 text-xs ml-2 font-mono">{item.created_at ? new Date(item.created_at).toLocaleTimeString() : ''}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <pre className="text-xs text-slate-400 bg-black/30 p-4 overflow-x-auto font-mono leading-relaxed">
              {JSON.stringify(item, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DeveloperDiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orderId, setOrderId] = useState('');

  const fetchDiagnostics = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const query = orderId ? `?orderId=${encodeURIComponent(orderId)}` : '';
      const res = await devGet(`/notifications/diagnostics${query}`, signal);
      if (res.aborted) return;
      if (res.success && res.data) {
        setDiagnostics(res.data);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast.error('Failed to load notification diagnostics');
      }
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDiagnostics(controller.signal);
    return () => controller.abort();
  }, [fetchDiagnostics]);

  return (
    <DevErrorBoundary pageTitle="Notification Diagnostics Trace">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <Bell className="w-6 h-6 text-primary-400" />
              Order Notification Lifecycle Diagnostics
            </h1>
            <p className="text-slate-400 text-xs mt-1">Deep trace of PostgreSQL notification queue state, delivered inbox entries, and stage transitions.</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={orderId}
              onChange={e => setOrderId(e.target.value)}
              placeholder="Filter by Order ID (e.g. ord_123)..."
              className="w-full bg-slate-900/70 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 font-mono"
            />
          </div>
          <button
            onClick={() => fetchDiagnostics()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition-all disabled:opacity-60 shrink-0 cursor-pointer shadow-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Run Trace
          </button>
        </div>

        {/* Panels */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : diagnostics ? (
          <div className="space-y-6">
            {/* Queued Items */}
            <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
                <SectionTitle icon={Bell} title="PostgreSQL Notification Queue State" />
                <span className="text-slate-400 text-xs font-mono">{diagnostics.queuedItems?.length ?? 0} queued rows</span>
              </div>
              {diagnostics.queuedItems?.length > 0 ? (
                diagnostics.queuedItems.map((item: any) => <ExpandableQueueRow key={item.id} item={item} />)
              ) : (
                <div className="flex items-center gap-2 px-5 py-6 text-slate-500 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Queue is clear (0 pending items)
                </div>
              )}
            </div>

            {/* Inbox Trace */}
            <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
                <SectionTitle icon={BarChart3} title="Notification Inbox (Delivered Messages)" />
                <span className="text-slate-400 text-xs font-mono">{diagnostics.inboxItems?.length ?? 0} delivered rows</span>
              </div>
              {diagnostics.inboxItems?.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {diagnostics.inboxItems.map((item: any) => (
                    <div key={item.id} className="px-5 py-3 flex items-start gap-3 hover:bg-white/[0.02]">
                      <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${item.is_read ? 'bg-slate-600' : 'bg-primary-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-white text-xs font-bold truncate">{item.title}</span>
                          <StatusPill status={item.category || 'general'} />
                        </div>
                        <p className="text-slate-400 text-xs truncate">{item.body}</p>
                        <p className="text-slate-600 text-[10px] font-mono mt-0.5">{item.user_id}</p>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 shrink-0">
                        <CopyButton value={item.id} />
                        <span className="text-[11px] font-mono">{item.created_at ? new Date(item.created_at).toLocaleTimeString() : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-6 text-slate-500 text-xs">No matching delivered inbox items found</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-white/5 text-slate-500 text-sm">
            Enter an Order ID and click Run Trace to inspect notification states.
          </div>
        )}
      </div>
    </DevErrorBoundary>
  );
}
