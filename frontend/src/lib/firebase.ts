import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// Dynamic import for messaging to prevent initial heavy load
const firebaseConfig = {
  apiKey: "AIzaSyAqkcY-WQrW3WoZWRrv8oo7MTAI_nVrLw4",
  authDomain: "olive-pizza-08.firebaseapp.com",
  projectId: "olive-pizza-08",
  storageBucket: "olive-pizza-08.firebasestorage.app",
  messagingSenderId: "1017239455106",
  appId: "1:1017239455106:web:ea5dd73d10722020007b9b"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Async getter for messaging
export const getMessagingInstance = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  const { getMessaging } = await import('firebase/messaging');
  return getMessaging(app);
};
export const getCurrentAuthToken = async (): Promise<string> => {
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) return token;
    } catch {}
  }

  if (typeof (auth as any).authStateReady === 'function') {
    try {
      await (auth as any).authStateReady();
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        if (token) return token;
      }
    } catch {}
  }

  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe();
      if (user) {
        try {
          const token = await user.getIdToken();
          if (token) {
            resolve(token);
            return;
          }
        } catch (e) {
          reject(e);
          return;
        }
      }
      reject(new Error("User not authenticated with Firebase Auth"));
    });

    setTimeout(() => {
      unsubscribe();
      reject(new Error("Firebase auth initialization timed out"));
    }, 4000);
  });
};
