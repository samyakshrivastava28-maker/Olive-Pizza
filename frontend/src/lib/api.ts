import { getApiUrl, PRODUCTION_BACKEND_URL } from './config';
import { auth } from './firebase';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface ApiFetchOptions {
  ttlMs?: number;
  forceRefresh?: boolean;
}

// In-flight GET promises map for request deduplication (keyed by uid:endpoint)
const inFlightRequests = new Map<string, Promise<any>>();

// In-memory hot cache with TTL (user-isolated)
const memoryCache = new Map<string, CacheEntry<any>>();

// Endpoints containing private, financial, or state-mutating user data must never be cached
const SENSITIVE_ENDPOINTS_REGEX = /\/(cart|checkout|payment|auth|user|profile|orders\/my|my-orders)/i;

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
 * Builds a deterministic, user-isolated cache key for a GET request
 */
function buildCacheKey(endpoint: string, uid?: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const userPrefix = uid ? `user:${uid}` : 'anon';
  return `GET:${userPrefix}:${cleanEndpoint}`;
}

/**
 * Invalidate cached responses matching a pattern or clear all
 */
export function invalidateApiCache(pattern?: string | RegExp): void {
  if (!pattern) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key)) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Completely purges both in-memory cache and in-flight request deduplication maps
 */
export function purgeApiCache(): void {
  memoryCache.clear();
  inFlightRequests.clear();
}

// Listen to auth changes to immediately purge private user data on login/logout
if (typeof window !== 'undefined' && auth) {
  try {
    auth.onAuthStateChanged(() => {
      purgeApiCache();
    });
  } catch {}
}

/**
 * Resilient JSON Fetch helper with:
 * 1. Request deduplication (identical in-flight GET requests share the same promise)
 * 2. In-memory TTL caching with strict user-isolation (user:uid:endpoint)
 * 3. Automatic bypass of cache for sensitive endpoints (cart, checkout, payment, auth)
 * 4. Automatic Bearer auth token injection
 * 5. Automatic hardware device fingerprint header
 * 6. Transparent fallback to direct backend URL if proxy fails
 */
export async function fetchApiJson<T = any>(
  endpoint: string,
  init?: RequestInit,
  options?: ApiFetchOptions
): Promise<T> {
  const method = (init?.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const currentUserUid = auth.currentUser?.uid;
  const isSensitive = SENSITIVE_ENDPOINTS_REGEX.test(cleanEndpoint);

  // Sensitive endpoints NEVER use cache
  const effectiveTtlMs = isSensitive ? 0 : (options?.ttlMs ?? 0);
  const forceRefresh = options?.forceRefresh ?? false;
  const cacheKey = buildCacheKey(cleanEndpoint, currentUserUid);

  // 1. Return from in-memory TTL cache if valid GET, not forcing refresh, and not sensitive
  if (isGet && !forceRefresh && !isSensitive && effectiveTtlMs > 0) {
    const cached = memoryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T;
    }
  }

  // 2. Request deduplication for simultaneous in-flight GET requests
  if (isGet && !forceRefresh && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey) as Promise<T>;
  }

  const executionPromise = (async () => {
    try {
      const primaryUrl = getApiUrl(endpoint);
      const headers = new Headers(init?.headers || {});
      if (!headers.has('X-Device-Id')) {
        headers.set('X-Device-Id', getOrGenerateDeviceId());
      }
      if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
      }

      try {
        const currentUser = auth.currentUser;
        if (currentUser && !headers.has('Authorization')) {
          const token = await currentUser.getIdToken();
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
          }
        }
      } catch (err) {
        console.warn('[fetchApiJson] Bearer token error:', err);
      }

      const mergedInit: RequestInit = { ...init, headers };

      let res: Response;
      try {
        res = await fetch(primaryUrl, mergedInit);
        if (!res.ok && primaryUrl.startsWith('/') && (res.status >= 500 || res.status === 404)) {
          const directUrl = `${PRODUCTION_BACKEND_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
          res = await fetch(directUrl, mergedInit);
        }
      } catch (networkErr) {
        if (primaryUrl.startsWith('/')) {
          const directUrl = `${PRODUCTION_BACKEND_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
          res = await fetch(directUrl, mergedInit);
        } else {
          throw networkErr;
        }
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const message = errJson?.error || errJson?.message || `HTTP ${res.status}`;
        const error: any = new Error(message);
        error.status = res.status;
        error.data = errJson;
        throw error;
      }

      const data = await res.json();

      // Store in TTL cache if applicable and not sensitive
      if (isGet && !isSensitive && effectiveTtlMs > 0) {
        memoryCache.set(cacheKey, {
          data,
          expiresAt: Date.now() + effectiveTtlMs,
        });
      }

      return data as T;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  if (isGet) {
    inFlightRequests.set(cacheKey, executionPromise);
  }

  return executionPromise;
}

export { memoryCache, inFlightRequests };

// ─── TYPED SMART BOOTSTRAP API CLIENT HELPERS ─────────────────────────────────

export interface HomeBootstrapResponse {
  success: boolean;
  categories: any[];
  featuredProducts: any[];
  offers: any[];
  storeStatus: any;
  activeOrderSummary?: any;
  unreadNotifications?: number;
}

export interface MenuBootstrapResponse {
  success: boolean;
  categories: any[];
  products: any[];
  offers: any[];
  availability: Record<string, boolean>;
}

export interface CartBootstrapResponse {
  success: boolean;
  coupons: any[];
  deliveryFeeConfig: any;
  packagingCharge: number;
  taxRates: any;
}

export interface TrackingBootstrapResponse {
  success: boolean;
  order: any;
  restaurant: any;
  rider: any;
  payment: any;
  timeline: any[];
}

export async function fetchHomeBootstrap(branchId?: string, forceRefresh = false): Promise<HomeBootstrapResponse> {
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
  return fetchApiJson<HomeBootstrapResponse>(`/api/v1/home/bootstrap${query}`, undefined, {
    ttlMs: 30000,
    forceRefresh,
  });
}

export async function fetchMenuBootstrap(branchId?: string, forceRefresh = false): Promise<MenuBootstrapResponse> {
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
  return fetchApiJson<MenuBootstrapResponse>(`/api/v1/menu/bootstrap${query}`, undefined, {
    ttlMs: 30000,
    forceRefresh,
  });
}

export async function fetchCartBootstrap(forceRefresh = false): Promise<CartBootstrapResponse> {
  return fetchApiJson<CartBootstrapResponse>('/api/v1/cart/bootstrap', undefined, {
    ttlMs: 60000,
    forceRefresh,
  });
}

export async function fetchTrackingBootstrap(orderId: string): Promise<TrackingBootstrapResponse> {
  return fetchApiJson<TrackingBootstrapResponse>(`/api/v1/orders/${encodeURIComponent(orderId)}/tracking/bootstrap`, undefined, {
    ttlMs: 0,
    forceRefresh: true,
  });
}
