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

  // Handle incoming AI actions from Olive Pizza AI Assistant
  useEffect(() => {
    const handleActionPayload = (action: any) => {
      if (!action) return;
      const normType = String(action.type || '').toUpperCase();
      const payload = action.payload || {};

      if (normType === 'ADD_TO_CART') {
        const productId = payload.productId || payload.id || 'olive-pizza-item';
        const name = payload.name || payload.productName || 'Handcrafted Pizza';
        const variant = payload.variant || payload.size || 'Regular';
        const crust = payload.crust || 'Classic Hand Tossed';
        const addons = Array.isArray(payload.addons) ? payload.addons : [];
        const quantity = Number(payload.quantity) || 1;
        const price = Number(payload.unitPrice || payload.price) || 299;
        const image = payload.image || payload.photoUrl || '/logo-transparent.png';

        const configHash = `${variant}-${crust}-${addons.slice().sort().join(',')}`;
        const cartItemId = `${productId}-${configHash}`;

        useCartStore.getState().addItem({
          id: cartItemId,
          menuItemId: productId,
          name,
          price,
          quantity,
          image,
          variant,
          crust,
          addons,
        });

        // Trigger floating cart pulse and flying animations
        window.dispatchEvent(new CustomEvent('cart-item-added'));
      }
    };

    const handleWindowMessage = (e: MessageEvent) => {
      if (e.data?.type === 'OLIVE_AI_ACTION') {
        handleActionPayload(e.data.payload);
      }
    };

    const handleCustomEvent = (e: CustomEvent) => {
      handleActionPayload(e.detail);
    };

    window.addEventListener('message', handleWindowMessage);
    window.addEventListener('olive-ai-action', handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener('message', handleWindowMessage);
      window.removeEventListener('olive-ai-action', handleCustomEvent as EventListener);
    };
  }, []);

  return null;
}
