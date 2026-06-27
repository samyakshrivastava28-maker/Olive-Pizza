import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'your_firebase_api_key' 
    ? import.meta.env.VITE_FIREBASE_API_KEY 
    : "AIzaSyDx57bciljPxJsEZFhDXg44q1UT6_PMIaw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN && import.meta.env.VITE_FIREBASE_AUTH_DOMAIN !== 'your_firebase_auth_domain'
    ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
    : "olive-pizza.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID && import.meta.env.VITE_FIREBASE_PROJECT_ID !== 'your_firebase_project_id'
    ? import.meta.env.VITE_FIREBASE_PROJECT_ID
    : "olive-pizza",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET && import.meta.env.VITE_FIREBASE_STORAGE_BUCKET !== 'your_firebase_storage_bucket'
    ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
    : "olive-pizza.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID && import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID !== 'your_firebase_messaging_sender_id'
    ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID
    : "932564309735",
  appId: import.meta.env.VITE_FIREBASE_APP_ID && import.meta.env.VITE_FIREBASE_APP_ID !== 'your_firebase_app_id'
    ? import.meta.env.VITE_FIREBASE_APP_ID
    : "1:932564309735:web:3dfef47c4ce0a211087442"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Messaging might fail if the browser doesn't support it or if it's run in a restricted environment
export const messaging = typeof window !== 'undefined' && 'Notification' in window ? getMessaging(app) : null;

export const getCurrentAuthToken = async (): Promise<string> => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new Error("User not authenticated with Firebase Auth");
  }
  return await firebaseUser.getIdToken();
};
