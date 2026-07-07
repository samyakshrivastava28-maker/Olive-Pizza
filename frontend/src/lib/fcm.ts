import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app } from './firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

export async function requestNotificationPermission(userId: string) {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.log('Firebase Messaging is not supported in this browser.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return await verifyAndRefreshTokens(userId);
    } else {
      console.log('Notification permission denied.');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while requesting notification permission:', error);
    return null;
  }
}

export async function verifyAndRefreshTokens(userId?: string) {
  try {
    const supported = await isSupported();
    if (!supported || Notification.permission !== 'granted') return null;

    // Ensure our custom SW is registered
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('FCM Token generated successfully.');
      if (userId) {
        await saveTokenToFirestore(userId, token);
        await saveTokenToBackend(token);
      }

      onMessage(messaging, (payload) => {
        console.log('Foreground message received: ', payload);
        if (payload.data && payload.data.type === 'APP_UPDATE') {
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
    console.error('Token refresh failed:', error);
    return null;
  }
}

async function saveTokenToFirestore(userId: string, token: string) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token),
      notificationEnabled: true,
      lastTokenUpdate: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Failed to save token to firestore, maybe no profile yet:', err);
  }
}

export async function saveTokenToBackend(token: string) {
  try {
    // Get Firebase Auth token
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth(app);
    if (!auth.currentUser) return;
    const authToken = await auth.currentUser.getIdToken();
    
    // Post to backend
    await fetch('/api/notifications/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        token,
        deviceName: navigator.userAgent.substring(0, 50),
        platform: navigator.platform,
        browser: 'Web'
      })
    });
  } catch (e) {
    console.error('Failed to sync token to backend Postgres', e);
  }
}
