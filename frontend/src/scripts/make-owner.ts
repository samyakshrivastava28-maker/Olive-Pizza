import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); // Load root .env

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function makeOwner() {
  try {
    console.log("Searching for olivepizzarjn@gmail.com...");
    const q = query(collection(db, 'users'), where('email', '==', 'olivepizzarjn@gmail.com'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log("User not found! Please register with olivepizzarjn@gmail.com first.");
      process.exit(1);
    }

    for (const d of snapshot.docs) {
      await updateDoc(doc(db, 'users', d.id), { role: 'owner' });
      console.log(`Successfully made ${d.id} an owner!`);
    }
    process.exit(0);
  } catch (error) {
    console.error("Error updating user:", error);
    process.exit(1);
  }
}

makeOwner();
