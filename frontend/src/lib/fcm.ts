import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app } from './firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';
import { isCapacitorNative, getPushCompatibility } from './platform';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

/**
 * Requests push notification permission from the user.
 * - If running in Capacitor native: defers to the native plugin (no action here).
 * - If running in a supported web browser: uses Firebase Web Push.
 * - If on iOS Safari without PWA: skips and relies on email fallback.
 */
export async function requestNotificationPermission(userId: string): Promise<string | null> {
  try {
    const compat = getPushCompatibility();

    // Capacitor handles its own push permission natively — do nothing here
    if (compat.mode === 'native') {
      console.log('[FCM] Running in Capacitor native mode — push managed by native plugin.');
      return null;
    }

    // iOS Safari or unsupported browser — email fallback only
    if (compat.mode === 'email_only') {
      console.log('[FCM] Push not supported:', compat.reason);
      return null;
    }

    const supported = await isSupported();
    if (!supported) {
      console.log('[FCM] Firebase Messaging not supported in this browser.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return await verifyAndRefreshTokens(userId);
    } else {
      console.log('[FCM] Notification permission denied.');
      return null;
    }
  } catch (error) {
    console.error('[FCM] Error requesting notification permission:', error);
    return null;
  }
}

/**
 * Silently verifies and refreshes the FCM token on app startup.
 * Skips silently if Capacitor native, not supported, or permission not granted.
 */
export async function verifyAndRefreshTokens(userId?: string): Promise<string | null> {
  try {
    // Skip if Capacitor native (native plugin manages the token)
    if (isCapacitorNative()) return null;

    const supported = await isSupported();
    if (!supported || Notification.permission !== 'granted') return null;

    // Register our standalone FCM service worker (separate from any Workbox SW)
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      const oldToken = localStorage.getItem('fcm_token');

      if (token !== oldToken && userId) {
        await saveTokenToFirestore(userId, token);
        await saveTokenToBackend(token, oldToken);
        localStorage.setItem('fcm_token', token);
        console.log('[FCM] Token refreshed and synced.');
      } else if (!oldToken && userId) {
        await saveTokenToBackend(token);
        localStorage.setItem('fcm_token', token);
        console.log('[FCM] Token saved for first time.');
      }

      // Listen for foreground messages (when tab is open)
      onMessage(messaging, (payload) => {
        console.log('[FCM] Foreground message received:', payload.data?.tag || 'no-tag');

        // App update push
        if (payload.data?.type === 'APP_UPDATE') {
          import('./versionManager').then(({ useVersionStore }) => {
            useVersionStore.getState().setUpdateAvailable(
              true,
              payload.data!.mode || 'optional',
              payload.data!.version || 'latest',
              payload.data!.releaseNotes
            );
          });
        }
      });

      return token;
    }
    return null;
  } catch (error) {
    console.error('[FCM] Token refresh failed:', error);
    return null;
  }
}

async function saveTokenToFirestore(userId: string, token: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token),
      notificationEnabled: true,
      lastTokenUpdate: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[FCM] Failed to save token to Firestore:', err);
  }
}

export async function saveTokenToBackend(token: string, oldToken?: string | null): Promise<void> {
  try {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth(app);
    if (!auth.currentUser) return;
    const authToken = await auth.currentUser.getIdToken();

    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      localStorage.setItem('device_id', deviceId);
    }

    await fetch(`${BACKEND_URL}/api/notifications/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        token,
        oldToken: oldToken || undefined,
        deviceId,
        deviceName: navigator.userAgent.substring(0, 100),
        platform: isCapacitorNative() ? 'android_native' : (navigator.platform || 'web'),
        browser: isCapacitorNative() ? 'Capacitor' : 'Web',
      }),
    });
  } catch (e) {
    console.error('[FCM] Failed to sync token to backend:', e);
  }
}

/**
 * Removes the locally cached FCM token on logout.
 * Marks it inactive in the backend.
 */
export async function deregisterToken(): Promise<void> {
  try {
    const token = localStorage.getItem('fcm_token');
    if (!token) return;

    const { getAuth } = await import('firebase/auth');
    const auth = getAuth(app);
    if (!auth.currentUser) return;
    const authToken = await auth.currentUser.getIdToken();

    await fetch(`${BACKEND_URL}/api/notifications/token/deregister`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ token }),
    });
    localStorage.removeItem('fcm_token');
    console.log('[FCM] Token deregistered on logout.');
  } catch (e) {
    console.warn('[FCM] Token deregistration failed (non-critical):', e);
  }
}
