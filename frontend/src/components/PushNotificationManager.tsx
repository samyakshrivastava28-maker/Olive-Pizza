/**
 * Olive Pizza — Enterprise Push Notification Manager
 *
 * Responsibilities:
 * 1. Request notification permission on first login
 * 2. Register FCM token in Postgres (dedup, multi-device sync)
 * 3. Forward auth token to Service Worker for Quick Actions
 * 4. Listen for foreground messages and display in-app toast + update store
 * 5. Listen to BroadcastChannel for SW → app sync (state changes from Quick Actions)
 * 6. Adaptive heartbeat (30s for delivery, 5m for customers/owners)
 * 7. Auto-refresh expired FCM token
 * 8. Subscribe to notification preferences (DND)
 */

import { useEffect, useRef, useCallback } from 'react';
import { getMessagingInstance, db, auth } from '../lib/firebase';
import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { LocationManager } from '../lib/permissions';
import { useAuthStore } from '../lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { useNavigate } from 'react-router';

const API_BASE = '/api';
const BROADCAST_CHANNEL = 'olive_pizza_notifications';

// Global audio state for continuous alerts
let continuousAudio: HTMLAudioElement | null = null;

function startContinuousAlert(soundName: string) {
  try {
    if (continuousAudio) return; // Already playing
    const soundMap: Record<string, string> = {
      'order_alert.mp3': '/sounds/order_alert.mp3',
      'delivery_chime.mp3': '/sounds/delivery_chime.mp3',
    };
    const src = soundMap[soundName] || soundMap['order_alert.mp3'];
    continuousAudio = new Audio(src);
    continuousAudio.loop = true;
    
    // Read volume preference from persisted store
    try {
      const persisted = JSON.parse(localStorage.getItem('olive-owner-settings') || '{}');
      const volumePref = persisted?.state?.volumeLevel;
      continuousAudio.volume = volumePref !== undefined ? parseFloat(volumePref) : 1.0;
    } catch {
      continuousAudio.volume = 1.0;
    }
    
    continuousAudio.play().catch(err => {
      console.warn('[PushManager] Autoplay blocked for continuous alert:', err);
    });
  } catch {}
}

function stopContinuousAlert() {
  if (continuousAudio) {
    continuousAudio.pause();
    continuousAudio.currentTime = 0;
    continuousAudio = null;
  }
}


export default function PushNotificationManager() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [tokenRegistered, setTokenRegistered] = useState(false);

  const user = useAuthStore(state => state.user);
  const userRole = useAuthStore(state => state.role);
  const navigate = useNavigate();

  const messagingRef = useRef<Messaging | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tokenRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const messageUnsubRef = useRef<(() => void) | null>(null);

  // ─── SW Registration ───────────────────────────────────────────────────────
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const swUrl = `/firebase-messaging-sw.js`;
      const reg = await navigator.serviceWorker.register(swUrl, { scope: '/firebase-cloud-messaging-push-scope' });
      await reg.update();
      return reg;
    } catch (err) {
      console.error('[PushManager] SW registration failed:', err);
      return null;
    }
  }, []);

  // ─── Token Registration ────────────────────────────────────────────────────
  const registerToken = useCallback(async (uid: string): Promise<void> => {
    try {
      const messaging = await getMessagingInstance();
      if (!messaging) return;

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || "BDfxvZSqSw6Es3dvXz4VZMwjNFKMCCfRSgdCVty3rfqqBZ6AAWFlZ2EwWQR8ltp6DRMTUKOmH9Rlu0fjCziOKDk";
      if (!vapidKey) { console.error('[PushManager] Missing VITE_FIREBASE_VAPID_KEY'); return; }

      const swReg = await registerServiceWorker();
      if (!swReg) return;

      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
      if (!token) { console.warn('[PushManager] Empty token received'); return; }

      // Register in Postgres via backend (handles dedup)
      const authToken = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_BASE}/notifications/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          token,
          deviceName: navigator.userAgent.slice(0, 100),
          platform: navigator.platform,
          browser: getBrowserName(),
          appVersion: import.meta.env.VITE_APP_VERSION || '1.0',
        }),
      });

      if (res.ok) {
        setTokenRegistered(true);
        console.log('[PushManager] ✅ Token registered');

        // Forward auth token to SW for Quick Actions background API calls
        if (navigator.serviceWorker.controller && authToken) {
          navigator.serviceWorker.controller.postMessage({
            type: 'STORE_AUTH_TOKEN',
            uid,
            token: authToken,
          });
        }
      }
    } catch (err) {
      console.error('[PushManager] Token registration error:', err);
    }
  }, [registerServiceWorker]);

  // ─── Permission Request ────────────────────────────────────────────────────
  const requestPermission = useCallback(async (uid: string): Promise<void> => {
    try {
      const messaging = await getMessagingInstance();
      if (!messaging) return;

      const permission = await Notification.requestPermission();
      setShowPrompt(false);

      if (permission === 'granted') {
        await registerToken(uid);

        // Set up foreground message listener after permission granted
        messagingRef.current = messaging;
        setupForegroundListener(messaging);
      }
    } catch (err) {
      console.error('[PushManager] Permission error:', err);
      setShowPrompt(false);
    }
  }, [registerToken]);

  // ─── Foreground Message Listener ──────────────────────────────────────────
  const setupForegroundListener = useCallback((messaging: Messaging) => {
    if (messageUnsubRef.current) messageUnsubRef.current();

    messageUnsubRef.current = onMessage(messaging, async payload => {
      const { notification, data } = payload;
      const title = notification?.title || 'Olive Pizza';
      const body = notification?.body || '';
      const url = data?.url || '/';
      const sound = data?.sound;
      const queueId = data?.queueId;
      const orderId = data?.orderId;

      // Acknowledge foreground delivery
      if (queueId) {
        fetch(`${API_BASE}/notifications/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queueId, stage: 'delivered', orderId }),
        }).catch(() => {});
      }

      // If the tab is hidden (minimized/backgrounded), show a native OS notification
      // This ensures users never miss alerts when the app is open but not visible
      if (document.hidden && Notification.permission === 'granted') {
        try {
          const swReg = await navigator.serviceWorker.ready;
          swReg.showNotification(title, {
            body,
            icon: 'https://res.cloudinary.com/dxmlvkff1/image/upload/v1782376898/olive-pizza/brand/logo.png',
            badge: 'https://res.cloudinary.com/dxmlvkff1/image/upload/v1782376898/olive-pizza/brand/badge_mono.png',
            tag: data?.tag || `fg_${Date.now()}`,
            // @ts-ignore
            renotify: true,
            vibrate: [200, 100, 200],
            data: { url, orderId, queueId },
          });
        } catch { /* non-fatal */ }
      }

      // Play sound for foreground messages
      if (data?.alert === 'continuous') {
        startContinuousAlert(sound || 'order_alert.mp3');
      } else if (sound && sound !== 'default') {
        playNotificationSound(sound);
      }

      // Show premium in-app toast
      toast.custom(
        (t) => (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="max-w-sm w-full"
            onClick={() => {
              if (data?.alert === 'continuous') return; // Do not dismiss continuous alerts on click
              toast.dismiss(t.id);
              navigate(url);
              if (queueId) {
                fetch(`${API_BASE}/notifications/track`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ queueId, stage: 'opened', orderId }),
                }).catch(() => {});
              }
            }}
            style={{ cursor: data?.alert === 'continuous' ? 'default' : 'pointer' }}
          >
            <div
              className="rounded-2xl p-4 flex flex-col gap-3 shadow-2xl"
              style={{
                background: 'rgba(10,10,10,0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(249,115,22,0.3)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(249,115,22,0.1)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                >
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-sm leading-snug">{title}</p>
                  <p className="text-slate-400 text-xs mt-0.5 leading-relaxed line-clamp-2 whitespace-pre-line">{body}</p>
                </div>
                {data?.alert !== 'continuous' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toast.dismiss(t.id); }}
                    className="text-slate-500 hover:text-slate-300 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {data?.alert === 'continuous' && (
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      // Fire action to stop alert
                      const token = await auth.currentUser?.getIdToken();
                      fetch(`${API_BASE}/notifications/action`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ orderId, action: 'stop_alert', currentStage: data.stage })
                      });
                    }}
                    className="flex-1 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                  >
                    🔕 Stop Alert
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.dismiss(t.id);
                      navigate(url);
                    }}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                  >
                    📊 Open Order
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ),
        { duration: data?.alert === 'continuous' ? 60000 : 8000, position: 'top-center' }
      );
    });
  }, [navigate]);

  // ─── BroadcastChannel listener (SW Quick Action results) ──────────────────
  useEffect(() => {
    broadcastRef.current = new BroadcastChannel(BROADCAST_CHANNEL);

    broadcastRef.current.onmessage = (event) => {
      const { type, title, body, url, action, orderId, newStatus, sound } = event.data || {};

      if (type === 'ACTION_SUCCESS' || type === 'SYNC_ACTION_SUCCESS') {
        toast.success(`✅ ${action} → ${newStatus}`, { duration: 3000 });
        // Trigger a Firestore/state refresh
        window.dispatchEvent(new CustomEvent('olive:order:updated', { detail: { orderId, newStatus } }));
      }

      if (type === 'NEW_NOTIFICATION' && document.hidden) {
        // Tab in background — show a toast when user focuses the tab
        window.dispatchEvent(new CustomEvent('olive:new_notification', { detail: event.data }));
      }

      if (type === 'GPS_UPDATE') {
        window.dispatchEvent(new CustomEvent('olive:gps:update', { detail: event.data }));
      }

      if (type === 'START_ALERT') {
        startContinuousAlert(sound || 'order_alert.mp3');
      }

      if (type === 'STOP_ALERT') {
        stopContinuousAlert();
      }
    };

    return () => {
      broadcastRef.current?.close();
    };
  }, []);

  // ─── Main Init Effect ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      // Clear everything on logout
      if (messageUnsubRef.current) messageUnsubRef.current();
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      if (tokenRefreshTimerRef.current) clearTimeout(tokenRefreshTimerRef.current);
      setTokenRegistered(false);
      return;
    }

    const uid = user.uid;

    // Show permission prompt after 3 seconds if not yet granted
    if (Notification.permission === 'default') {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    if (Notification.permission === 'granted') {
      // Register token immediately if not done yet
      if (!tokenRegistered) {
        registerToken(uid);
      }

      // Set up foreground listener
      getMessagingInstance().then(messaging => {
        if (messaging) {
          messagingRef.current = messaging;
          setupForegroundListener(messaging);
        }
      });

      // Auto-refresh auth token in SW every 50 minutes (Firebase tokens expire in 60 min)
      const refreshTokenInSW = async () => {
        const freshToken = await auth.currentUser?.getIdToken(true);
        if (freshToken && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'STORE_AUTH_TOKEN', uid, token: freshToken
          });
        }
      };
      tokenRefreshTimerRef.current = setInterval(refreshTokenInSW, 50 * 60 * 1000);
    }

    return () => {
      if (messageUnsubRef.current) messageUnsubRef.current();
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      if (tokenRefreshTimerRef.current) clearInterval(tokenRefreshTimerRef.current);
    };
  }, [user, tokenRegistered, registerToken, setupForegroundListener]);

  // ─── Adaptive Heartbeat ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    // Delivery partners get 30s heartbeats (with GPS), customers/owners get 5min
    const intervalMs = userRole === 'delivery_partner' ? 30_000 : 5 * 60_000;

    const sendHeartbeat = async (includeGPS = false) => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const body: any = {
          online: true,
          deviceName: navigator.userAgent.slice(0, 80),
          browser: getBrowserName(),
          platform: navigator.platform,
          appVersion: import.meta.env.VITE_APP_VERSION || '1.0',
          notificationReady: Notification.permission === 'granted',
        };

        // Delivery partners include GPS in heartbeat
        if (includeGPS && userRole === 'delivery_partner' && navigator.geolocation) {
          try {
            const permState = await LocationManager.checkPermissionState();
            if (permState === 'granted') {
              const pos = await getCurrentPosition();
              body.lat = pos.coords.latitude;
              body.lng = pos.coords.longitude;
              body.speed = pos.coords.speed;
              body.accuracy = pos.coords.accuracy;
            }
          } catch {} // GPS failure is non-fatal
        }

        await fetch(`${API_BASE}/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
      } catch {} // Heartbeat failure is always non-fatal
    };

    // Initial heartbeat after 5s
    const initialTimeout = setTimeout(() => sendHeartbeat(true), 5000);

    heartbeatTimerRef.current = setInterval(() => sendHeartbeat(userRole === 'delivery_partner'), intervalMs);

    return () => {
      clearTimeout(initialTimeout);
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, [user, userRole]);

  // ─── Permission Prompt UI ─────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -60, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm"
        >
          <div
            className="relative overflow-hidden rounded-3xl p-5"
            style={{
              background: 'rgba(10,10,10,0.95)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(249,115,22,0.25)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(249,115,22,0.1)',
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-0.5 rounded-full"
              style={{ background: 'linear-gradient(90deg, #f97316, #fbbf24, #f97316)' }}
            />
            <button
              onClick={() => setShowPrompt(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(249,115,22,0.1))', border: '1px solid rgba(249,115,22,0.3)' }}
              >
                <Bell className="w-6 h-6 text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-black text-sm mb-1">Enable Order Notifications</h3>
                <p className="text-slate-400 text-xs leading-relaxed mb-4">
                  Get instant alerts for new orders, delivery updates, and live tracking. Never miss an update.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => user && requestPermission(user.uid)}
                    className="flex-1 text-white text-sm font-black py-2.5 rounded-xl transition-all"
                    style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 4px 16px rgba(249,115,22,0.4)' }}
                  >
                    Enable
                  </button>
                  <button
                    onClick={() => setShowPrompt(false)}
                    className="px-4 text-slate-400 text-sm font-bold py-2.5 rounded-xl border border-white/10 hover:bg-white/5"
                  >
                    Later
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5">
              <ShieldCheck className="w-3 h-3 text-slate-500" />
              <p className="text-slate-600 text-[10px]">Notifications can be disabled anytime in Settings</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Unknown';
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 5000,
      maximumAge: 15000,
    });
  });
}

function playNotificationSound(soundName: string) {
  try {
    const soundMap: Record<string, string> = {
      'order_alert.mp3': '/sounds/order_alert.mp3',
      'delivery_chime.mp3': '/sounds/delivery_chime.mp3',
      'success_ding.mp3': '/sounds/success_ding.mp3',
      'cancel_buzz.mp3': '/sounds/cancel_buzz.mp3',
      'soft_pop.mp3': '/sounds/soft_pop.mp3',
      'system_alert.mp3': '/sounds/system_alert.mp3',
    };
    const src = soundMap[soundName];
    if (!src) return;
    const audio = new Audio(src);
    try {
      const persisted = JSON.parse(localStorage.getItem('olive-owner-settings') || '{}');
      const volumePref = persisted?.state?.volumeLevel;
      audio.volume = volumePref !== undefined ? parseFloat(volumePref) : 0.7;
    } catch {
      audio.volume = 0.7;
    }
    audio.play().catch(() => {}); // Autoplay may be blocked — non-fatal
  } catch {}
}
