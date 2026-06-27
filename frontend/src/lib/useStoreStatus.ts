import { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { OPENING_HOUR, CLOSING_HOUR } from './config';

interface StoreStatus {
  isRestaurantOpen: boolean;
  isDeliveryAvailable: boolean;
  isLoading: boolean;
  isWithinBusinessHours: boolean;
  deliveryRadiusKm: number;
}

export function useStoreStatus(): StoreStatus {
  const [status, setStatus] = useState<StoreStatus>({
    isRestaurantOpen: true,
    isDeliveryAvailable: true,
    isLoading: true,
    isWithinBusinessHours: true,
    deliveryRadiusKm: 5
  });

  useEffect(() => {
    // Check local time
    const currentHour = new Date().getHours();
    const isWithinHours = currentHour >= OPENING_HOUR && currentHour < CLOSING_HOUR;

    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStatus({
          isRestaurantOpen: data.isRestaurantOpen ?? true,
          isDeliveryAvailable: data.isDeliveryAvailable ?? true,
          isLoading: false,
          isWithinBusinessHours: isWithinHours,
          deliveryRadiusKm: data.deliveryRadiusKm ?? 5
        });
      } else {
        setStatus(s => ({ ...s, isLoading: false, isWithinBusinessHours: isWithinHours }));
      }
    }, (error) => {
      console.error("Failed to listen to store settings:", error);
      setStatus(s => ({ ...s, isLoading: false, isWithinBusinessHours: isWithinHours }));
    });

    return () => unsubscribe();
  }, []);

  return status;
}
