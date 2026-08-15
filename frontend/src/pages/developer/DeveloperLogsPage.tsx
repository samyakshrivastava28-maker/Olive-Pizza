import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Terminal, RefreshCw, CheckCircle2, XCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { devGet, devPost } from '../../lib/devopsApi';
import { DevErrorBoundary } from '../../components/developer/DevUI';

export default function DeveloperLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingPing, setTestingPing] = useState(false);

  const fetchLogs = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await devGet('/notifications/logs?limit=100', signal);
      if (res.aborted) return;
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast.error('Failed to load FCM logs');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchLogs(controller.signal);
    return () => controller.abort();
  }, [fetchLogs]);

  const handleSendTestPing = async () => {
    setTestingPing(true);
    try {
      const res = await devPost('/notifications/send-test', { templateId: 'developer_alert' });
      if (res.success) {
        toast.success(res.message || 'Dispatched live test push notification!');
        fetchLogs();
      } else {
        toast.error(res.error || 'Failed to dispatch test push');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTestingPing(false);
    }
  };

  return (
    <DevErrorBoundary pageTitle="FCM Logs">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <Terminal className="w-6 h-6 text-primary-400" />
              Firebase Cloud Messaging (FCM) Delivery Logs
            </h1>
            <p className="text-slate-400 text-xs mt-1">Real-time inspection of device tokens, FCM gateway responses, error payloads, and push latency.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendTestPing}
              disabled={testingPing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-xs font-bold text-white transition-all disabled:opacity-50 shrink-0 cursor-pointer shadow-md"
            >
              <Send className={`w-3.5 h-3.5 ${testingPing ? 'animate-spin' : ''}`} />
              {testingPing ? 'Dispatching...' : 'Send Test Push'}
            </button>
            <button
              onClick={() => fetchLogs()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all disabled:opacity-50 shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Logs
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : logs.length > 0 ? (
          <div className="space-y-2.5">
            {logs.map((log, i) => (
              <motion.div
                key={log.id || i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.015 }}
                className="bg-slate-900/60 border border-white/[0.08] rounded-xl px-4 py-3 flex items-start gap-3"
              >
                {log.status === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-white text-xs font-mono truncate">
                      {log.userId || (log.fcmToken ? `${log.fcmToken.slice(0, 24)}...` : 'Unknown Device')}
                    </span>
                    {log.elapsedTimeMs && <span className="text-slate-500 text-xs font-mono">{log.elapsedTimeMs}ms</span>}
                    {log.orderId && <span className="text-primary-400 text-xs font-mono">order: {log.orderId}</span>}
                  </div>
                  {log.errorDetails && (
                    <p className="text-red-400 text-xs mt-1 font-mono bg-red-500/10 p-1 rounded">
                      {log.errorDetails}
                    </p>
                  )}
                  {log.timestamp && (
                    <p className="text-slate-600 text-[10px] mt-0.5 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-white/5 text-slate-500 text-sm">
            No FCM delivery logs recorded in cache. Click "Send Test Push" to dispatch a push message.
          </div>
        )}
      </div>
    </DevErrorBoundary>
  );
}
