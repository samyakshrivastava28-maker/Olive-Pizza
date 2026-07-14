import { useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useCartStore } from '../lib/store';

export default function CartSyncManager() {
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.total);
  const isInternalUpdate = useRef(false);

  // Read from Firestore (Remote to Local Sync)
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const setupListener = () => {
      const user = auth.currentUser;
      if (!user) return;
      
      const cartRef = doc(db, 'users', user.uid, 'private', 'cart');
      
      unsubscribe = onSnapshot(cartRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Prevent setting state if this update was triggered by our own write
          isInternalUpdate.current = true;
          
          useCartStore.setState({
            items: data.items || [],
            total: data.total || 0,
          });
          
          // Reset the flag after state has updated
          setTimeout(() => {
            isInternalUpdate.current = false;
          }, 100);
        }
      });
    };

    const authUnsubscribe = auth.onAuthStateChanged((user) => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (user) {
        setupListener();
      } else {
        // Clear cart on logout
        isInternalUpdate.current = true;
        useCartStore.setState({ items: [], total: 0 });
        setTimeout(() => { isInternalUpdate.current = false; }, 100);
      }
    });

    return () => {
      authUnsubscribe();
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Write to Firestore (Local to Remote Sync)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    
    // Don't trigger a write back to Firestore if this state change came FROM Firestore
    if (isInternalUpdate.current) return;
    
    const timeoutId = setTimeout(() => {
      const cartRef = doc(db, 'users', user.uid, 'private', 'cart');
      setDoc(cartRef, { items, total, updatedAt: new Date().toISOString() }, { merge: true })
        .catch(err => console.error("Failed to sync cart to Firestore:", err));
    }, 500); // Debounce writes
    
    return () => clearTimeout(timeoutId);
  }, [items, total]);

  return null;
}
