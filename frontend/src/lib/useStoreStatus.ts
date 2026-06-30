import { useDataStore } from './dataStore';

interface StoreStatus {
  isRestaurantOpen: boolean;
  isDeliveryAvailable: boolean;
  isLoading: boolean;
  isWithinBusinessHours: boolean;
  deliveryRadiusKm: number;
}

export function useStoreStatus(): StoreStatus {
  return useDataStore(state => state.storeStatus);
}
