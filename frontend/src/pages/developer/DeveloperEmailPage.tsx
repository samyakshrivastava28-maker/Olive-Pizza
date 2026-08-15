import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mail, Clock, ShieldCheck, Zap, RefreshCw, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { devGet, devPost } from '../../lib/devopsApi';
import { StatCard, SectionTitle, DevErrorBoundary } from '../../components/developer/DevUI';

export default function DeveloperEmailPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [retryEmailId, setRetryEmailId] = useState('');
  const [retrying, setRetrying] = useState(false);

  const fetchEmailStats = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await devGet('/health', signal);
      if (res.aborted) return;
      if (res.success && res.data) {
        setHealth(res.data);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast.error('Failed to load email telemetry');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchEmailStats(controller.signal);
    return () => controller.abort();
  }, [fetchEmailStats]);

  const handleSendTestAlert = async () => {
    setSendingAlert(true);
    try {
      const res = await devPost('/test-alert');
      if (res.success) {
        toast.success(res.message || 'Developer alert sent to webhub2811@gmail.com');
      } else {
        toast.error(res.error || 'Failed to dispatch alert');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSendingAlert(false);
    }
  };

  const handleRetryEmail = async () => {
    if (!retryEmailId.trim()) {
      toast.error('Please enter a valid email queue ID');
      return;
    }
    setRetrying(true);
    try {
      const res = await devPost(`/email-retry/${retryEmailId.trim()}`);
      if (res.success) {
        toast.success(res.message || `Email ID ${retryEmailId} enqueued for immediate retry`);
        setRetryEmailId('');
        fetchEmailStats();
      } else {
        toast.error(res.error || 'Retry failed');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <DevErrorBoundary pageTitle="Email Operations">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <Mail className="w-6 h-6 text-primary-400" />
              Email Controls & Dead-Letter Telemetry
            </h1>
            <p className="text-slate-400 text-xs mt-1">Monitor background SMTP dispatch, reset stalled queue items, and trigger emergency diagnostic alert emails.</p>
          </div>
          <button
            onClick={() => fetchEmailStats()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={Mail}
            label="Dead Letter Queue"
            value={health?.deadLetterCount ?? 0}
            color="text-red-400"
            sub="failed after max retries"
          />
          <StatCard
            icon={Clock}
            label="Last Email Sent"
            value={health?.lastSentEmailAt ? new Date(health.lastSentEmailAt).toLocaleTimeString() : 'N/A'}
            color="text-green-400"
            sub={health?.lastSentEmailAt ? new Date(health.lastSentEmailAt).toLocaleDateString() : 'No recent emails'}
          />
          <StatCard
            icon={ShieldCheck}
            label="Developer Alerts Target"
            value="webhub2811@gmail.com"
            color="text-primary-400"
            sub="locked recipient"
          />
        </div>

        {/* Control Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Send Test Alert */}
          <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-primary-400" />
                <h3 className="text-white font-bold text-base">Send Test Developer Alert</h3>
              </div>
              <p className="text-slate-400 text-xs mb-6">
                Sends an immediate diagnostic system alert email to <strong>webhub2811@gmail.com</strong> using <code className="text-primary-300">DevAlertService</code>. Rate-limited to 1 alert per 15 minutes.
              </p>
            </div>
            <button
              onClick={handleSendTestAlert}
              disabled={sendingAlert}
              className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${sendingAlert ? 'animate-spin' : ''}`} />
              {sendingAlert ? 'Sending Alert...' : 'Send Test Alert to webhub2811@gmail.com'}
            </button>
          </div>

          {/* Retry Failed Email */}
          <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-5 h-5 text-orange-400" />
                <h3 className="text-white font-bold text-base">Manual Email Queue Retry</h3>
              </div>
              <p className="text-slate-400 text-xs mb-6">
                Reset a failed or dead-letter queued email record back to <code className="text-orange-300">'pending'</code> state for immediate worker processing.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={retryEmailId}
                onChange={e => setRetryEmailId(e.target.value)}
                placeholder="Enter Queue Email ID (e.g. 42)"
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 font-mono"
              />
              <button
                onClick={handleRetryEmail}
                disabled={retrying || !retryEmailId.trim()}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {retrying ? 'Retrying...' : 'Retry Email'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DevErrorBoundary>
  );
}
