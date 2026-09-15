export const RESTAURANT_LOCATION = {
  address: "Dongargaon Rd, near Saraswati school, Gokul Nagar, Rajnandgaon, Chhattisgarh 491441",
  phone: "7771000000",
  lat: 21.0810244,
  lng: 81.0123793
};

export const MAX_DELIVERY_RADIUS_KM = 15;
export const OPENING_HOUR = 12; // 12 PM (noon)
export const CLOSING_HOUR = 24; // 12 AM (midnight)

import { Capacitor } from '@capacitor/core';

export const PRODUCTION_BACKEND_URL = "https://olivepizza-owner.onrender.com";

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

function getOrGenerateDeviceId(): string {
  try {
    let id = localStorage.getItem('device_fingerprint');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      localStorage.setItem('device_fingerprint', id);
    }
    return id;
  } catch {
    return 'dev_web_client';
  }
}

/**
 * Resilient Fetch wrapper that automatically retries directly against Render backend
 * if local proxy / edge rewrite encounters a cold start or network glitch.
 * Automatically injects X-Device-Id header for hardware rate-limiting.
 */
export const fetchApi = async (endpoint: string, init?: RequestInit): Promise<Response> => {
  const primaryUrl = getApiUrl(endpoint);
  const headers = new Headers(init?.headers || {});
  if (!headers.has('X-Device-Id')) {
    headers.set('X-Device-Id', getOrGenerateDeviceId());
  }
  const mergedInit = { ...init, headers };
  
  try {
    const res = await fetch(primaryUrl, mergedInit);
    // If the response is OK, or not a relative proxy URL, or a valid HTTP client status (400, 401, 403, 429), return it directly
    if (res.ok || !primaryUrl.startsWith('/') || (res.status < 500 && res.status !== 404)) {
      return res;
    }
    // If relative fetch failed with gateway errors (502/503/504) or missing route (404), try direct production Render backend
    const directUrl = `${PRODUCTION_BACKEND_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    return await fetch(directUrl, mergedInit);
  } catch (err) {
    if (primaryUrl.startsWith('/')) {
      const directUrl = `${PRODUCTION_BACKEND_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
      return await fetch(directUrl, mergedInit);
    }
    throw err;
  }
};
