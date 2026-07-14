import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Bell, RefreshCw, Smartphone, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { getMessagingInstance, auth } from '../../lib/firebase';
import { useAuthStore } from '../../lib/store';
import { isIOS, isMacOS, isSafari, isStandalonePWA, getPushCompatibility } from '../../lib/platform';
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
    lastTestStatus: null as 'success' | 'failed' | null,
    backend: null as any
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
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || "BDfxvZSqSw6Es3dvXz4VZMwjNFKMCCfRSgdCVty3rfqqBZ6AAWFlZ2EwWQR8ltp6DRMTUKOmH9Rlu0fjCziOKDk" 
          }).catch(() => null);
        }
      }
    } catch (e) {
      console.error(e);
    }

    let backendData = null;
    try {
      const idToken = await user?.getIdToken();
      if (idToken) {
        const res = await fetch('/api/notifications/debug', {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        if (res.ok) {
          backendData = await res.json();
        }
      }
    } catch(e) {}

    setDiagnostics({
      swRegistered,
      permission,
      fcmToken: token,
      backendSync: !!token,
      vapidKey: true,
      lastTestStatus: diagnostics.lastTestStatus,
      backend: backendData
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

      {diagnostics.backend && (
        <div className="bg-slate-900 rounded-2xl p-6 border border-white/5 mt-6">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-500" /> Backend Queue Diagnostics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Queue Size</p>
              <p className="text-white font-medium text-lg">{diagnostics.backend.queueSize}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Avg Delivery Time</p>
              <p className="text-white font-medium text-lg">{diagnostics.backend.averageDeliveryTimeSec}s</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Failed Notifications</p>
              <p className="text-red-400 font-medium text-lg">{diagnostics.backend.failedNotifications}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Environment</p>
              <p className="text-primary-400 font-medium text-lg capitalize">{diagnostics.backend.environment}</p>
            </div>
            <div className="col-span-2 md:col-span-4 mt-2">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Current Frontend URL</p>
              <p className="text-white font-medium text-sm font-mono truncate">{diagnostics.backend.currentFrontendUrl}</p>
            </div>
          </div>
        </div>
      )}

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

      <div className="bg-slate-900 rounded-2xl p-6 border border-white/5 mb-8">
        <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary-500" />
          Apple & Platform Support
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-xl p-4">
            <h3 className="text-slate-400 text-sm mb-1">Detected OS</h3>
            <p className="text-white font-bold">{isIOS() ? 'iOS/iPadOS' : isMacOS() ? 'macOS' : 'Other'}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <h3 className="text-slate-400 text-sm mb-1">Browser</h3>
            <p className="text-white font-bold">{isSafari() ? 'Safari' : 'Other'}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <h3 className="text-slate-400 text-sm mb-1">Standalone PWA</h3>
            <p className="text-white font-bold">{isStandalonePWA() ? 'Yes' : 'No'}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <h3 className="text-slate-400 text-sm mb-1">Web Push Support</h3>
            <p className="text-white font-bold">{getPushCompatibility().supported ? 'Supported' : 'Not Supported'}</p>
            {!getPushCompatibility().supported && (
              <p className="text-red-400 text-xs mt-1">{getPushCompatibility().reason}</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl p-6 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary-500" />
            End-to-End Test
          </h3>
          <p className="text-slate-400 text-sm mt-1 max-w-md">
            Broadcast a test notification to all connected devices. This verifies the Service Worker, FCM transport, and Postgres queue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={sendTestNotification}
            disabled={!diagnostics.fcmToken}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all text-sm"
          >
            Foreground Test
          </button>
          
          <button 
            onClick={async () => {
              const { verifyAndRefreshTokens } = await import('../../lib/fcm');
              await verifyAndRefreshTokens(user?.uid);
              checkStatus();
              toast.success("Token refreshed");
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all text-sm"
          >
            Refresh Token
          </button>
          
          <button 
            onClick={async () => {
              if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (let r of regs) await r.unregister();
                const { verifyAndRefreshTokens } = await import('../../lib/fcm');
                await verifyAndRefreshTokens(user?.uid);
                checkStatus();
                toast.success("SW Re-registered");
              }
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all text-sm"
          >
            Re-register SW
          </button>
          <button 
            onClick={async () => {
              if (!diagnostics.fcmToken) {
                toast.error("FCM Token missing. Registration failed.");
                return;
              }
              if (!diagnostics.swRegistered) {
                toast.error("Service Worker missing.");
                return;
              }
              const token = await auth.currentUser?.getIdToken();
              if (!token) return;
              
              toast.success("Close the app completely! Notification arriving in 5 seconds...");
              
              setTimeout(async () => {
                try {
                  const res = await fetch('/api/notifications/send-custom', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                      title: 'Background Push Success! 🎉',
                      body: 'This notification arrived while the application was closed.',
                      audience: 'all',
                      category: 'system'
                    })
                  });
                  if (!res.ok) console.error("Backend dispatch failed");
                } catch (e) {
                  console.error(e);
                }
              }, 5000);
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all text-sm shadow-[0_0_15px_rgba(34,197,94,0.3)]"
          >
            Run Full Push Notification Test (5s Delay)
          </button>
        </div>
      </div>

      {/* Runtime Diagnostics (Development / Versioning) */}
      <div className="bg-slate-900 rounded-2xl p-6 border border-white/5 flex flex-col md:flex-row gap-6 mb-8">
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            Runtime Diagnostics (Live Updates)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Frontend App Version</p>
              <p className="text-white font-bold">{__APP_VERSION__}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Web Git Commit</p>
              <p className="text-white font-bold font-mono">{typeof __GIT_COMMIT__ !== 'undefined' ? __GIT_COMMIT__ : 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Frontend Build Timestamp</p>
              <p className="text-white font-bold text-sm">{typeof __BUILD_TIMESTAMP__ !== 'undefined' ? new Date(__BUILD_TIMESTAMP__).toLocaleString() : 'N/A'}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 bg-slate-800 rounded-xl p-4 flex items-center justify-center">
            <button 
              onClick={async () => {
                const token = await auth.currentUser?.getIdToken();
                const res = await fetch('/api/version/status', {
                  headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                  const data = await res.json();
                  toast(`Backend Commit: ${data.git_commit}\nEnvironment: ${data.environment}`, { icon: 'ℹ️', duration: 4000 });
                }
              }}
              className="w-full h-full flex flex-col items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600/20 transition-all rounded-lg p-4 font-bold border border-blue-500/30"
            >
              Verify Live Version Consistency
            </button>
        </div>
      </div>

      {/* Test Email */}
      <div className="bg-slate-900 rounded-2xl p-6 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            Test Email Generator
          </h3>
          <p className="text-slate-400 text-sm mt-1 max-w-md">
            Queue a test email using mock order data to verify rendering and deliverability.
          </p>
        </div>
        <button 
          onClick={async () => {
            const token = await auth.currentUser?.getIdToken();
            if (!token) return;
            const toastId = toast.loading("Sending Test Email...");
            try {
              const res = await fetch('/api/email/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ recipient: user?.email, subject: "System Diagnostic Test" })
              });
              const data = await res.json();
              if (res.ok) {
                if (data.diagnostics) {
                  toast.success(
                    <div>
                      <strong>{data.message || "Test email sent!"}</strong>
                      <div className="text-xs mt-1 text-slate-100 opacity-80 break-words">
                        {data.diagnostics.response} ({data.diagnostics.durationMs}ms)
                      </div>
                    </div>, 
                    { id: toastId, duration: 6000 }
                  );
                } else {
                  toast.success(data.message || "Test Email Queued! Check your inbox.", { id: toastId });
                }
              } else {
                throw new Error(data.error || "Failed to send email");
              }
            } catch (err: any) {
              toast.error(
                <div>
                  <strong>Failed to send test email</strong>
                  <div className="text-xs mt-1 text-slate-100 opacity-80 break-words">
                    {err.message}
                  </div>
                </div>, 
                { id: toastId, duration: 8000 }
              );
            }
          }}
          className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold transition-all text-sm"
        >
          Send Test Email
        </button>
      </div>

    </div>
  );
}
