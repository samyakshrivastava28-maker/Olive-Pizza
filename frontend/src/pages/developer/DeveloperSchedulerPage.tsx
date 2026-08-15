import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, Play, RefreshCw, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { devGet, devPost } from '../../lib/devopsApi';
import { StatusPill, DevErrorBoundary } from '../../components/developer/DevUI';

export default function DeveloperSchedulerPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringJobId, setTriggeringJobId] = useState<string | null>(null);

  const fetchJobs = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await devGet('/scheduler/jobs', signal);
      if (res.aborted) return;
      if (res.success && res.data) {
        setJobs(res.data);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast.error('Failed to load scheduler jobs');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchJobs(controller.signal);
    return () => controller.abort();
  }, [fetchJobs]);

  const handleTriggerJob = async (jobId: string) => {
    setTriggeringJobId(jobId);
    try {
      const res = await devPost(`/scheduler/jobs/trigger/${jobId}`);
      if (res.success) {
        toast.success(res.message || `Triggered job ${jobId} successfully!`);
      } else {
        toast.error(res.error || 'Failed to trigger job');
      }
    } catch (e: any) {
      toast.error(e.message || 'Trigger job error');
    } finally {
      setTriggeringJobId(null);
    }
  };

  return (
    <DevErrorBoundary pageTitle="Scheduler & Crons">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <Clock className="w-6 h-6 text-primary-400" />
              Cron Job & Background Task Scheduler
            </h1>
            <p className="text-slate-400 text-xs mt-1">Manage system schedules, weekly reporting jobs, data lifecycle pruning, and manual job triggers.</p>
          </div>
          <button
            onClick={() => fetchJobs()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Schedules
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold text-sm">{job.name}</span>
                    <StatusPill status={job.status || 'active'} />
                  </div>
                  <p className="text-slate-400 text-xs">{job.description}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500 font-mono">
                    <span>Schedule: <strong className="text-primary-300">{job.schedulePattern}</strong></span>
                    {job.lastRunAt && <span>Last Run: {new Date(job.lastRunAt).toLocaleString()}</span>}
                  </div>
                </div>

                <button
                  onClick={() => handleTriggerJob(job.id)}
                  disabled={triggeringJobId === job.id}
                  className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${triggeringJobId === job.id ? 'animate-spin' : ''}`} />
                  {triggeringJobId === job.id ? 'Triggering...' : 'Run Job Now'}
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-white/5 text-slate-500 text-sm">
            No scheduled jobs configured.
          </div>
        )}
      </div>
    </DevErrorBoundary>
  );
}
