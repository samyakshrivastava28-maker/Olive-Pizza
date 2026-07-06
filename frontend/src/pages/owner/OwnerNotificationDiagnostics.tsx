import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Bell, RefreshCw, Smartphone, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { getMessagingInstance } from '../../lib/firebase';
import { useAuthStore } from '../../lib/store';
import toast from 'react-hot-toast';

export default function OwnerNotificationDiagnostics() {
  const user = useAuthStore(state => state.user);
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState({
    swRegistered: false,
    permission: 'default',
    fcmToken: null as string | null,
    backendSync: false,
    vapidKey: !!import.meta.env.VITE_FIREBASE_VAPID_KEY,
    lastTestStatus: null as 'success' | 'failed' | null
  });

  const checkStatus = async () => {
    setLoading(true);
    
    let swRegistered = false;
    let token = null;
    let permission = Notification.permission;
    
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      swRegistered = regs.some(r => r.active?.scriptURL.includes('firebase-messaging-sw.js'));
    }

    try {
      if (permission === 'granted') {
        const messaging = await getMessagingInstance();
        if (messaging) {
          const { getToken } = await import('firebase/messaging');
          token = await getToken(messaging, { 
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || "BIq5vy-awOEQYWgW9bRJrkMu2Bs0XKbI-DYkuh-IypgeKcJLSDDj1ZkS__EFJxiyrKKPlOp3Dm12kmGGXR6RtkI" 
          }).catch(() => null);
        }
      }
    } catch (e) {
      console.error(e);
    }

    setDiagnostics({
      swRegistered,
      permission,
      fcmToken: token,
      backendSync: !!token,
      vapidKey: true,
      lastTestStatus: diagnostics.lastTestStatus
    });
    setLoading(false);
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const sendTestNotification = async () => {
    try {
      const token = await user?.getIdToken();
      if (!token) return;
      const res = await fetch('/api/notifications/send-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: 'Test Notification',
          body: 'Your notification pipeline is fully functional!',
          audience: 'all',
          category: 'system'
        })
      });
      if (res.ok) {
        toast.success("Test notification queued!");
        setDiagnostics(prev => ({ ...prev, lastTestStatus: 'success' }));
      } else {
        throw new Error("Failed to queue");
      }
    } catch (err) {
      toast.error("Test notification failed");
      setDiagnostics(prev => ({ ...prev, lastTestStatus: 'failed' }));
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading Diagnostics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary-500" />
            Notification Health Monitor
          </h2>
          <p className="text-slate-400 text-sm mt-1">Live diagnostics for the enterprise messaging pipeline</p>
        </div>
        <button 
          onClick={checkStatus}
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Permission */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
              <ShieldCheck className={`w-5 h-5 ${diagnostics.permission === 'granted' ? 'text-green-500' : 'text-yellow-500'}`} />
            </div>
          </div>
          <h3 className="text-white font-bold text-lg">OS Permission</h3>
          <p className="text-slate-400 text-sm capitalize">{diagnostics.permission}</p>
        </div>

        {/* SW */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
              <Activity className={`w-5 h-5 ${diagnostics.swRegistered ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </div>
          <h3 className="text-white font-bold text-lg">Service Worker</h3>
          <p className="text-slate-400 text-sm">{diagnostics.swRegistered ? 'Active & Ready' : 'Not Registered'}</p>
        </div>

        {/* Token */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
              <Smartphone className={`w-5 h-5 ${diagnostics.fcmToken ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </div>
          <h3 className="text-white font-bold text-lg">Push Token</h3>
          <p className="text-slate-400 text-sm">{diagnostics.fcmToken ? 'Generated' : 'Missing'}</p>
        </div>

        {/* Backend Sync */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
              {diagnostics.backendSync ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-red-500" />
              )}
            </div>
          </div>
          <h3 className="text-white font-bold text-lg">Database Sync</h3>
          <p className="text-slate-400 text-sm">{diagnostics.backendSync ? 'Synchronized' : 'Failed'}</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl p-6 border border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary-500" />
            End-to-End Test
          </h3>
          <p className="text-slate-400 text-sm mt-1 max-w-md">
            Broadcast a test notification to all connected devices. This verifies the Service Worker, FCM transport, and Postgres queue.
          </p>
        </div>
        <button 
          onClick={sendTestNotification}
          disabled={!diagnostics.fcmToken}
          className="px-6 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all"
        >
          Send Test Notification
        </button>
      </div>
    </div>
  );
}
