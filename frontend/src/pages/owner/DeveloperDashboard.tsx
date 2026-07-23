/**
 * DeveloperDashboard — Production DevOps Dashboard
 *
 * RESTRICTED TO: webhub2811@gmail.com with developer: true custom claim
 *
 * Panels:
 * ① System Health  — uptime, memory, Node version, postgres pool, active FCM tokens
 * ② Notification Queue — per-status breakdown with refresh
 * ③ Email Queue — per-status breakdown
 * ④ Notification Diagnostics — searchable queue + inbox trace
 * ⑤ FCM Delivery Logs — latest delivery log entries
 * ⑥ Init Developer Claim — one-click setup utility
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Bell, Mail, Database, Cpu, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Clock, Search,
  ShieldCheck, Zap, Terminal, BarChart3, HardDrive, Wifi,
  ChevronDown, ChevronRight, Copy, Check
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import toast from 'react-hot-toast';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://olive-pizza-backend.onrender.com';

async function devGet(path: string) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`${BACKEND}/devops${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function devPost(path: string, body?: any) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`${BACKEND}/devops${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function StatCard({ icon: Icon, label, value, color = 'text-primary-400', sub }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; color?: string; sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-5 flex items-start gap-4"
    >
      <div className={`p-2.5 rounded-xl bg-white/5 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="text-white text-xl font-bold mt-0.5 truncate">{value}</p>
        {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    queued: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    sending: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    sent: 'bg-green-500/15 text-green-400 border-green-500/30',
    failed: 'bg-red-500/15 text-red-400 border-red-500/30',
    pending: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    delivered: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  };
  const cls = map[status] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {status}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-slate-500 hover:text-slate-300 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-primary-400" />
      <h2 className="text-white font-bold text-base">{title}</h2>
    </div>
  );
}

function QueueBreakdown({ title, icon: Icon, data }: {
  title: string; icon: React.ComponentType<{ className?: string }>; data: Record<string, number> | null;
}) {
  const total = data ? Object.values(data).reduce((a, b) => a + b, 0) : 0;
  return (
    <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-primary-400" />
        <span className="text-white font-semibold text-sm">{title}</span>
        <span className="ml-auto text-slate-400 text-xs">total: {total}</span>
      </div>
      {data ? (
        <div className="space-y-2">
          {Object.entries(data).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between">
              <StatusPill status={status} />
              <span className="text-slate-300 text-sm font-mono font-bold">{count}</span>
            </div>
          ))}
          {Object.keys(data).length === 0 && <p className="text-slate-500 text-xs">Queue is empty</p>}
        </div>
      ) : <p className="text-slate-500 text-xs">No data</p>}
    </div>
  );
}

function ExpandableRow({ item }: { item: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/5 last:border-0">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 py-3 px-4 hover:bg-white/[0.03] transition-colors text-left">
        {open ? <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />}
        <StatusPill status={item.status} />
        <span className="text-slate-300 text-xs font-mono truncate flex-1">{item.id}</span>
        <span className="text-slate-500 text-xs">{item.category}</span>
        <span className="text-slate-500 text-xs ml-2">{item.created_at ? new Date(item.created_at).toLocaleTimeString() : ''}</span>
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

export default function DeveloperDashboard() {
  const [health, setHealth] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagOrderId, setDiagOrderId] = useState('');
  const [fcmLogs, setFcmLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'health' | 'diagnostics' | 'logs' | 'security'>('health');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true); setHealthError(null);
    try { const res = await devGet('/health'); setHealth(res.data); }
    catch (err: any) { setHealthError(err.message); }
    finally { setHealthLoading(false); }
  }, []);

  const fetchDiagnostics = useCallback(async () => {
    setDiagLoading(true);
    try {
      const path = diagOrderId ? `/notifications/diagnostics?orderId=${encodeURIComponent(diagOrderId)}` : '/notifications/diagnostics';
      const res = await devGet(path); setDiagnostics(res.data);
    } catch (err: any) { toast.error(`Diagnostics: ${err.message}`); }
    finally { setDiagLoading(false); }
  }, [diagOrderId]);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try { const res = await devGet('/notifications/logs?limit=50'); setFcmLogs(res.data || []); }
    catch (err: any) { toast.error(`Logs: ${err.message}`); }
    finally { setLogsLoading(false); }
  }, []);

  const initClaim = async () => {
    setClaimLoading(true);
    try { const res = await devPost('/init-claim'); toast.success(res.message || 'Developer claim set.'); }
    catch (err: any) { toast.error(err.message); }
    finally { setClaimLoading(false); }
  };

  useEffect(() => { fetchHealth(); }, [fetchHealth]);
  useEffect(() => {
    if (activeTab === 'diagnostics') fetchDiagnostics();
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab]);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => fetchHealth(), 10000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchHealth]);

  const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;
  const fmt = (s: number) => {
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const tabs = [
    { id: 'health', label: 'System Health', icon: Activity },
    { id: 'diagnostics', label: 'Notification Trace', icon: Bell },
    { id: 'logs', label: 'FCM Logs', icon: Terminal },
    { id: 'security', label: 'Setup', icon: ShieldCheck },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-primary-500/10 border border-primary-500/20">
            <Cpu className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Developer Dashboard</h1>
            <p className="text-slate-400 text-sm">Olive Pizza — Production System Monitor</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(a => !a)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${autoRefresh ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
              {autoRefresh ? 'Live' : 'Manual'}
            </button>
            <button
              onClick={() => { fetchHealth(); if (activeTab === 'diagnostics') fetchDiagnostics(); if (activeTab === 'logs') fetchLogs(); }}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-black/30 p-1 rounded-xl border border-white/[0.08] mt-5 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex-1 justify-center ${activeTab === id ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* System Health */}
        {activeTab === 'health' && (
          <motion.div key="health" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {healthError && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm">{healthError}</p>
              </div>
            )}
            {healthLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(7)].map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />)}
              </div>
            ) : health ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                  <StatCard icon={Clock} label="Uptime" value={fmt(health.uptimeSeconds)} color="text-green-400" />
                  <StatCard icon={Cpu} label="Node" value={health.nodeVersion} color="text-blue-400" />
                  <StatCard icon={HardDrive} label="RSS Memory" value={mb(health.memoryUsage.rss)} sub={`Heap: ${mb(health.memoryUsage.heapUsed)} / ${mb(health.memoryUsage.heapTotal)}`} color="text-purple-400" />
                  <StatCard icon={Wifi} label="Active FCM Tokens" value={health.activeFcmTokensCount} color="text-primary-400" sub="registered devices" />
                  <StatCard icon={Database} label="PG Pool Total" value={health.postgresPool.totalCount} color="text-orange-400" />
                  <StatCard icon={Activity} label="PG Idle" value={health.postgresPool.idleCount} color="text-teal-400" />
                  <StatCard icon={Zap} label="PG Waiting" value={health.postgresPool.waitingCount} color={health.postgresPool.waitingCount > 0 ? 'text-red-400' : 'text-slate-400'} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <QueueBreakdown title="Notification Queue" icon={Bell} data={health.notificationQueueStatus} />
                  <QueueBreakdown title="Email Queue" icon={Mail} data={health.emailQueueStatus} />
                </div>
              </>
            ) : null}
          </motion.div>
        )}

        {/* Notification Trace */}
        {activeTab === 'diagnostics' && (
          <motion.div key="diagnostics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex gap-2 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input value={diagOrderId} onChange={e => setDiagOrderId(e.target.value)}
                  placeholder="Filter by Order ID (optional)"
                  className="w-full bg-slate-900/70 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500" />
              </div>
              <button onClick={fetchDiagnostics} disabled={diagLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold transition-all disabled:opacity-60">
                <RefreshCw className={`w-4 h-4 ${diagLoading ? 'animate-spin' : ''}`} />Fetch
              </button>
            </div>

            {diagLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}</div>
            ) : diagnostics ? (
              <div className="space-y-5">
                <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
                    <SectionTitle icon={Bell} title="Notification Queue Items" />
                    <span className="text-slate-400 text-xs">{diagnostics.queuedItems?.length ?? 0} rows</span>
                  </div>
                  {diagnostics.queuedItems?.length > 0
                    ? diagnostics.queuedItems.map((item: any) => <ExpandableRow key={item.id} item={item} />)
                    : <div className="flex items-center gap-2 px-4 py-6 text-slate-500 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" />Queue is empty</div>
                  }
                </div>

                <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
                    <SectionTitle icon={BarChart3} title="Notification Inbox (Last Delivered)" />
                    <span className="text-slate-400 text-xs">{diagnostics.inboxItems?.length ?? 0} rows</span>
                  </div>
                  {diagnostics.inboxItems?.length > 0 ? (
                    <div className="divide-y divide-white/5">
                      {diagnostics.inboxItems.map((item: any) => (
                        <div key={item.id} className="px-4 py-3 flex items-start gap-3">
                          <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${item.is_read ? 'bg-slate-600' : 'bg-primary-400'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-white text-sm font-medium truncate">{item.title}</span>
                              <StatusPill status={item.category || 'general'} />
                            </div>
                            <p className="text-slate-400 text-xs truncate">{item.body}</p>
                            <p className="text-slate-600 text-xs mt-0.5">{item.user_id}</p>
                          </div>
                          <div className="flex items-center gap-1 text-slate-600">
                            <CopyButton value={item.id} />
                            <span className="text-xs">{item.created_at ? new Date(item.created_at).toLocaleTimeString() : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="px-4 py-6 text-slate-500 text-sm">No inbox items found</div>}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 text-sm">Click "Fetch" to load notification pipeline data</div>
            )}
          </motion.div>
        )}

        {/* FCM Logs */}
        {activeTab === 'logs' && (
          <motion.div key="logs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex justify-between items-center mb-4">
              <p className="text-slate-400 text-sm">Last 50 FCM delivery log entries</p>
              <button onClick={fetchLogs} disabled={logsLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs hover:text-white transition-all">
                <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />Refresh
              </button>
            </div>
            {logsLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}</div>
            ) : fcmLogs.length > 0 ? (
              <div className="space-y-2">
                {fcmLogs.map((log, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                    className="bg-slate-900/60 border border-white/[0.08] rounded-xl px-4 py-3 flex items-start gap-3">
                    {log.status === 'success'
                      ? <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-xs font-mono truncate">{log.userId || (log.fcmToken?.slice(0, 20) + '…')}</span>
                        {log.elapsedTimeMs && <span className="text-slate-500 text-xs">{log.elapsedTimeMs}ms</span>}
                        {log.orderId && <span className="text-primary-400 text-xs">order: {log.orderId}</span>}
                      </div>
                      {log.errorDetails && <p className="text-red-400 text-xs mt-0.5">{log.errorDetails}</p>}
                      {log.timestamp && <p className="text-slate-600 text-xs mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 text-sm">No FCM delivery logs available</div>
            )}
          </motion.div>
        )}

        {/* Setup */}
        {activeTab === 'security' && (
          <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="space-y-4 max-w-xl">
              <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-primary-400" />
                  <h3 className="text-white font-bold">Initialize Developer Claim</h3>
                </div>
                <p className="text-slate-400 text-sm mb-5">
                  Grants the <code className="text-primary-300 bg-primary-500/10 px-1 rounded">developer: true</code> Firebase Custom Claim
                  to <strong>webhub2811@gmail.com</strong>. After clicking, sign out and back in to activate.
                </p>
                <button onClick={initClaim} disabled={claimLoading}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm transition-all disabled:opacity-60">
                  {claimLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {claimLoading ? 'Setting claim…' : 'Grant Developer Claim'}
                </button>
              </div>

              <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-amber-300 font-semibold text-sm mb-1">Backend Auth</p>
                    <p className="text-amber-200/60 text-xs leading-relaxed">
                      All <code>/devops/*</code> endpoints verify both the Firebase ID token and the{' '}
                      <code>developer: true</code> custom claim server-side via <code>requireDeveloper.ts</code>.
                      This UI guard is a secondary convenience layer.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
