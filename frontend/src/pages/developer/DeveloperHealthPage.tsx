import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Clock, Cpu, HardDrive, Wifi, Database,
  Zap, Bell, Mail, RefreshCw, XCircle, Trash2, ExternalLink
} from 'lucide-react';
import { Link } from 'react-router';
import toast from 'react-hot-toast';
import { devGet, devPost } from '../../lib/devopsApi';
import { StatCard, StatusPill, DevErrorBoundary } from '../../components/developer/DevUI';

export default function DeveloperHealthPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [purgingLogs, setPurgingLogs] = useState(false);

  const fetchHealth = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await devGet('/health', signal);
      if (res.aborted) return;
      if (res.success && res.data) {
        setHealth(res.data);
        setError(null);
      } else {
        setError(res.error || 'Failed to retrieve system health');
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message || 'System health endpoint unreachable');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchHealth(controller.signal);
    return () => controller.abort();
  }, [fetchHealth]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchHealth();
    }, 8000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealth]);

  const handlePurgeJobLogs = async () => {
    if (!window.confirm("Permanently delete old pg_cron job_run_details logs & realtime tracking points from PostgreSQL?")) return;
    const toastId = toast.loading("Purging job_run_details logs from PostgreSQL...");
    setPurgingLogs(true);
    try {
      const res = await devPost('/purge-job-logs');
      if (res.success) {
        toast.success(res.message || "Purge complete!", { id: toastId });
        fetchHealth();
      } else {
        throw new Error(res.message || "Purge failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Purge failed", { id: toastId });
    } finally {
      setPurgingLogs(false);
    }
  };

  const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;
  const fmt = (s: number) => {
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <DevErrorBoundary pageTitle="System Health">
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <Activity className="w-6 h-6 text-primary-400" />
              System Health & Telemetry
            </h1>
            <p className="text-slate-400 text-xs mt-1">Real-time Node.js runtime, PostgreSQL connection pools, memory RSS, and queue counters.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePurgeJobLogs}
              disabled={purgingLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all disabled:opacity-50 cursor-pointer"
              title="Reclaim PostgreSQL storage space by clearing finished cron execution logs"
            >
              <Trash2 className={`w-3.5 h-3.5 ${purgingLogs ? 'animate-spin' : ''}`} />
              {purgingLogs ? 'Purging...' : 'Purge DB Job Logs'}
            </button>
            <button
              onClick={() => setAutoRefresh(a => !a)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${autoRefresh ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
              {autoRefresh ? 'Live (8s)' : 'Manual'}
            </button>
            <button
              onClick={() => fetchHealth()}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm font-mono">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : health ? (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <StatCard icon={Clock} label="Uptime" value={fmt(health?.uptimeSeconds || 0)} color="text-green-400" />
              <StatCard icon={Cpu} label="Node Runtime" value={health?.nodeVersion || 'v20'} color="text-blue-400" />
              <StatCard icon={HardDrive} label="RSS Memory" value={mb(health?.memoryUsage?.rss || 0)} sub={`Heap: ${mb(health?.memoryUsage?.heapUsed || 0)} / ${mb(health?.memoryUsage?.heapTotal || 0)}`} color="text-purple-400" />
              <StatCard icon={Wifi} label="Active FCM Tokens" value={health?.activeFcmTokensCount ?? 0} color="text-primary-400" sub="active registered devices" />
              <StatCard icon={Database} label="PG Pool Total" value={health?.postgresPool?.totalCount ?? 0} color="text-orange-400" />
              <StatCard icon={Activity} label="PG Pool Idle" value={health?.postgresPool?.idleCount ?? 0} color="text-teal-400" />
              <StatCard icon={Zap} label="PG Waiting" value={health?.postgresPool?.waitingCount ?? 0} color={(health?.postgresPool?.waitingCount || 0) > 0 ? 'text-red-400' : 'text-slate-400'} />
              <StatCard icon={Mail} label="Dead Letter Queue" value={health?.deadLetterCount ?? 0} color="text-red-400" sub="failed email items" />
            </div>

            {/* Quick Banner to Data Manager */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-primary-950/40 via-slate-900 to-slate-900 border border-primary-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary-500/10 rounded-xl border border-primary-500/30 text-primary-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Multi-Database & Storage Manager</h3>
                  <p className="text-xs text-slate-400">Manage, auto-detect, and test 16 supported providers including Firestore, PostgreSQL, R2, Cloudinary, and Pinecone.</p>
                </div>
              </div>
              <Link
                to="/developer/data-manager"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shrink-0"
              >
                <Database className="w-3.5 h-3.5" />
                Open Data Manager
              </Link>
            </div>

            {/* Queue Breakdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="w-4 h-4 text-primary-400" />
                  <span className="text-white font-semibold text-sm">Notification Queue Status</span>
                </div>
                <div className="space-y-2">
                  {health.notificationQueueStatus && Object.keys(health.notificationQueueStatus).length > 0 ? (
                    Object.entries(health.notificationQueueStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                        <StatusPill status={status} />
                        <span className="text-slate-300 text-sm font-mono font-bold">{count as number}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-xs">Notification queue is empty</p>
                  )}
                </div>
              </div>

              <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="w-4 h-4 text-primary-400" />
                  <span className="text-white font-semibold text-sm">Email Queue Status</span>
                  {health.lastSentEmailAt && (
                    <span className="ml-auto text-[10px] text-slate-500">Last: {new Date(health.lastSentEmailAt).toLocaleTimeString()}</span>
                  )}
                </div>
                <div className="space-y-2">
                  {health.emailQueueStatus && Object.keys(health.emailQueueStatus).length > 0 ? (
                    Object.entries(health.emailQueueStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                        <StatusPill status={status} />
                        <span className="text-slate-300 text-sm font-mono font-bold">{count as number}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-xs">Email queue is empty</p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </DevErrorBoundary>
  );
}
