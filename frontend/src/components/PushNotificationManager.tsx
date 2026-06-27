import { useEffect } from 'react';
import { messaging, db, auth } from '../lib/firebase';
import { getToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function PushNotificationManager() {
  useEffect(() => {
    const requestPermissionAndSaveToken = async (userUid: string) => {
      try {
        if (!messaging) return; // Browser doesn't support notifications

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
          if (!vapidKey) {
            console.error('VITE_FIREBASE_VAPID_KEY is missing');
            return;
          }

          // Register SW manually with config in query string to hide keys from public/ folder
          const swUrl = `/firebase-messaging-sw.js?apiKey=${import.meta.env.VITE_FIREBASE_API_KEY}&authDomain=${import.meta.env.VITE_FIREBASE_AUTH_DOMAIN}&projectId=${import.meta.env.VITE_FIREBASE_PROJECT_ID}&storageBucket=${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET}&messagingSenderId=${import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID}&appId=${import.meta.env.VITE_FIREBASE_APP_ID}`;
          const registration = await navigator.serviceWorker.register(swUrl);
          
          const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
          if (token) {
            console.log('FCM Token acquired, saving to Firestore...');
            const userRef = doc(db, 'users', userUid);
            await updateDoc(userRef, {
              fcmTokens: arrayUnion(token)
            });
          }
        }
      } catch (error) {
        console.error('Error getting push notification permission/token:', error);
      }
    };

    // We only want to save the token for a logged-in user
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        requestPermissionAndSaveToken(user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  return null; // This is a logic-only component
}
