export const RESTAURANT_LOCATION = {
  address: "Dongargaon Rd, near Saraswati school, Gokul Nagar, Rajnandgaon, Chhattisgarh 491441",
  lat: 21.0810244,
  lng: 81.0123793
};

export const MAX_DELIVERY_RADIUS_KM = 15;
export const OPENING_HOUR = 12; // 12 PM (noon)
export const CLOSING_HOUR = 24; // 12 AM (midnight)

import { Capacitor } from '@capacitor/core';

export const PRODUCTION_BACKEND_URL = "https://olive-pizza-backend.onrender.com";

/**
 * Resilient API URL resolver:
 * - On Native Capacitor Android/iOS: directly routes to production Render backend
 * - On Web / PWA: routes through relative /api or falls back to production Render backend
 */
export const getApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (typeof window === 'undefined') return `${PRODUCTION_BACKEND_URL}${cleanEndpoint}`;

  // If running inside Capacitor Native Container or local webview
  if (
    Capacitor.isNativePlatform() ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'ionic:' ||
    (window.location.hostname === 'localhost' && window.location.port === '')
  ) {
    return `${PRODUCTION_BACKEND_URL}${cleanEndpoint}`;
  }

  return cleanEndpoint;
};

/**
 * Resilient Fetch wrapper that automatically retries directly against Render backend
 * if local proxy / edge rewrite encounters a cold start or network glitch.
 */
export const fetchApi = async (endpoint: string, init?: RequestInit): Promise<Response> => {
  const primaryUrl = getApiUrl(endpoint);
  
  try {
    const res = await fetch(primaryUrl, init);
    if (res.ok || !primaryUrl.startsWith('/')) return res;
    // If relative fetch failed with 404/502/504, try direct production Render backend
    const directUrl = `${PRODUCTION_BACKEND_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    return await fetch(directUrl, init);
  } catch (err) {
    if (primaryUrl.startsWith('/')) {
      const directUrl = `${PRODUCTION_BACKEND_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
      return await fetch(directUrl, init);
    }
    throw err;
  }
};
