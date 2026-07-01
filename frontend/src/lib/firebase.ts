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
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new Error("User not authenticated with Firebase Auth");
  }
  return await firebaseUser.getIdToken();
};
