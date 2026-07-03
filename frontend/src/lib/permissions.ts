export interface LocationData {
  lat: number;
  lng: number;
  fullAddress: string;
  city?: string;
  pincode?: string;
}

const CACHE_KEY = 'olive_cached_location';

export class LocationManager {
  /**
   * Retrieves the cached location from localStorage.
   */
  static getCachedLocation(): LocationData | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as LocationData;
      }
    } catch (e) {
      console.error('Failed to read cached location', e);
    }
    return null;
  }

  /**
   * Saves location to localStorage cache.
   */
  static setCachedLocation(location: LocationData) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(location));
    } catch (e) {
      console.error('Failed to cache location', e);
    }
  }

  /**
   * Checks the native browser geolocation permission state.
   */
  static async checkPermissionState(): Promise<'granted' | 'prompt' | 'denied'> {
    if (!navigator.geolocation) return 'denied';
    
    try {
      // @ts-ignore - TS might complain about 'geolocation' type
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state;
    } catch (e) {
      // Fallback for Safari / unsupported browsers
      return 'prompt';
    }
  }

  /**
   * Determines if the custom UI prompt should be shown.
   */
  static async shouldPrompt(): Promise<boolean> {
    const state = await this.checkPermissionState();
    if (state === 'denied') return false; // Don't prompt if denied permanently
    if (state === 'granted') return false; // Already granted
    
    const cached = this.getCachedLocation();
    if (cached) return false; // Don't prompt if we have a manual cache

    return true; // Prompt is needed
  }

  /**
   * Fetches GPS location natively and reverse geocodes it.
   */
  static async getCurrentLocation(options?: { forcePrompt?: boolean; fallbackToCache?: boolean }): Promise<LocationData> {
    const fallback = options?.fallbackToCache ?? true;
    
    return new Promise(async (resolve, reject) => {
      if (!navigator.geolocation) {
        const cached = this.getCachedLocation();
        if (fallback && cached) return resolve(cached);
        return reject(new Error('Geolocation not supported'));
      }

      const state = await this.checkPermissionState();
      
      // If permanently denied, fallback to cache immediately without triggering the browser prompt error
      if (state === 'denied' && !options?.forcePrompt) {
        const cached = this.getCachedLocation();
        if (fallback && cached) return resolve(cached);
        return reject(new Error('Location permission denied permanently.'));
      }

      // If prompt is needed but we have cache and we didn't force a prompt, use cache
      if (state === 'prompt' && !options?.forcePrompt) {
        const cached = this.getCachedLocation();
        if (fallback && cached) return resolve(cached);
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            
            const locationData: LocationData = {
              lat,
              lng,
              fullAddress: data.display_name || 'Current Location',
              city: data.address?.city || data.address?.town || data.address?.village || '',
              pincode: data.address?.postcode || ''
            };
            
            this.setCachedLocation(locationData);
            resolve(locationData);
          } catch (error) {
            const fallbackLoc: LocationData = { lat, lng, fullAddress: 'Current Location' };
            this.setCachedLocation(fallbackLoc);
            resolve(fallbackLoc);
          }
        },
        (error) => {
          const cached = this.getCachedLocation();
          if (fallback && cached) return resolve(cached);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }
}
