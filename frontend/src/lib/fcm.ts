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

    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY // Ensure this is set in .env
      });

      if (token) {
        console.log('FCM Token received.');
        await saveTokenToFirestore(userId, token);
        
        // Listen for foreground messages
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
    } else {
      console.log('Notification permission denied.');
    }
    return null;
  } catch (error) {
    console.error('An error occurred while requesting notification permission:', error);
    return null;
  }
}

async function saveTokenToFirestore(userId: string, token: string) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    fcmTokens: arrayUnion(token),
    notificationEnabled: true,
    lastTokenUpdate: new Date().toISOString()
  });
}
