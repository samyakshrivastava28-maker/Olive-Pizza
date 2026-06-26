import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAqkcY-WQrW3WoZWRrv8oo7MTAI_nVrLw4",
  authDomain: "olive-pizza-08.firebaseapp.com",
  projectId: "olive-pizza-08",
  storageBucket: "olive-pizza-08.firebasestorage.app",
  messagingSenderId: "1017239455106",
  appId: "1:1017239455106:web:ea5dd73d10722020007b9b"
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
