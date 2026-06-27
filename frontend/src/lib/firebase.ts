import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

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

// Messaging might fail if the browser doesn't support it or if it's run in a restricted environment
export const messaging = typeof window !== 'undefined' && 'Notification' in window ? getMessaging(app) : null;

export const getCurrentAuthToken = async (): Promise<string> => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new Error("User not authenticated with Firebase Auth");
  }
  return await firebaseUser.getIdToken();
};
