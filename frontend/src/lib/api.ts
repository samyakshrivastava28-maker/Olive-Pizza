import { getApiUrl, PRODUCTION_BACKEND_URL } from './config';
import { auth } from './firebase';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  timestamp: number;
}

export interface ApiFetchOptions {
  ttlMs?: number;
  forceRefresh?: boolean;
  persist?: boolean;
  swr?: boolean;
  onFreshData?: (data: any) => void;
}

// Canonical TTLs in milliseconds matching Backend Redis Layerbase cache
export const CLIENT_CACHE_TTL = {
  RESTAURANT_STATUS: 60 * 1000,    // 60s (1 min)
  COUPONS: 120 * 1000,             // 120s (2 min)
  HOME_BOOTSTRAP: 180 * 1000,      // 180s (3 min)
  CART_BOOTSTRAP: 180 * 1000,      // 180s (3 min)
  MENU_BOOTSTRAP: 300 * 1000,      // 300s (5 min)
  MASTER_CATALOG: 300 * 1000,      // 300s (5 min)
  BRANCH_MENU: 300 * 1000,         // 300s (5 min)
  APP_CONFIG: 600 * 1000,          // 600s (10 min)
};

const STORAGE_PREFIX = 'op_api_cache_';

// In-flight GET promises map for request deduplication (keyed by uid:endpoint)
const inFlightRequests = new Map<string, Promise<any>>();

// In-memory hot cache with TTL (user-isolated)
const memoryCache = new Map<string, CacheEntry<any>>();

// Endpoints containing private, financial, or state-mutating user data must never be cached
const SENSITIVE_ENDPOINTS_REGEX = /\/(cart\/add|cart\/update|cart\/remove|checkout|payment|auth|user|profile|orders\/my|my-orders|orders\/create)/i;

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
 * Reads cached entry from memory or persistent localStorage
 */
function getCachedEntry<T>(key: string): CacheEntry<T> | null {
  // 1. Hot memory check
  const mem = memoryCache.get(key);
  if (mem) return mem;

  // 2. Persistent storage restore for instant boot
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (raw) {
        const parsed: CacheEntry<T> = JSON.parse(raw);
        memoryCache.set(key, parsed);
        return parsed;
      }
    } catch {}
  }
  return null;
}

/**
 * Stores cached entry in memory and optionally localStorage
 */
function setCachedEntry<T>(key: string, data: T, ttlMs: number, persist: boolean = true): void {
  const now = Date.now();
  const entry: CacheEntry<T> = {
    data,
    timestamp: now,
    expiresAt: now + ttlMs,
  };
  memoryCache.set(key, entry);

  if (persist && typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
    } catch {}
  }
}

/**
 * Invalidate cached responses matching a pattern or clear all
 */
export function invalidateApiCache(pattern?: string | RegExp): void {
  if (!pattern) {
    memoryCache.clear();
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) keysToRemove.push(k);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch {}
    }
    return;
  }

  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          const bare = k.replace(STORAGE_PREFIX, '');
          if (regex.test(bare)) keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
  }
}

export function invalidateMenuCache(branchId?: string): void {
  if (branchId) {
    invalidateApiCache(new RegExp(`(menu|catalog|bootstrap).*${branchId}`));
  } else {
    invalidateApiCache(/(menu|catalog|bootstrap)/);
  }
}

export function invalidateStoreStatusCache(): void {
  invalidateApiCache(/(restaurant\/status|settings|store_config|live\/bootstrap)/);
}

export function invalidateCouponCache(): void {
  invalidateApiCache(/(coupons|cart\/bootstrap)/);
}

export function invalidateBootstrapCache(): void {
  invalidateApiCache(/bootstrap/);
}

/**
 * Completely purges both in-memory cache and in-flight request deduplication maps
 */
export function purgeApiCache(): void {
  invalidateApiCache();
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
 * 2. Multi-tier TTL caching (Memory + LocalStorage) matching backend Layerbase Redis TTLs
 * 3. Stale-While-Revalidate support for 0ms startup and instant transitions
 * 4. Automatic bypass of cache for sensitive endpoints (cart, checkout, payment, auth)
 * 5. Automatic Bearer auth token injection
 * 6. Automatic hardware device fingerprint header
 * 7. Transparent fallback to direct backend URL if proxy fails
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
  const persist = options?.persist ?? true;
  const enableSwr = options?.swr ?? true;
  const cacheKey = buildCacheKey(cleanEndpoint, currentUserUid);

  const cachedEntry = isGet && !isSensitive && effectiveTtlMs > 0 ? getCachedEntry<T>(cacheKey) : null;
  const isFresh = cachedEntry ? Date.now() < cachedEntry.expiresAt : false;

  // 1. Fresh cache hit: return immediately without network call
  if (isGet && !forceRefresh && cachedEntry && isFresh) {
    return cachedEntry.data;
  }

  // 2. Request deduplication for simultaneous in-flight GET requests
  if (isGet && !forceRefresh && inFlightRequests.has(cacheKey)) {
    if (cachedEntry && enableSwr) {
      return cachedEntry.data;
    }
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

      // Store in memory and persistent cache if applicable
      if (isGet && !isSensitive && effectiveTtlMs > 0) {
        setCachedEntry(cacheKey, data, effectiveTtlMs, persist);
        if (options?.onFreshData) {
          try {
            options.onFreshData(data);
          } catch (e) {
            console.warn(`[fetchApiJson] onFreshData handler error for ${cleanEndpoint}:`, e);
          }
        }
      }

      return data as T;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  if (isGet) {
    inFlightRequests.set(cacheKey, executionPromise);
  }

  // 3. Stale-While-Revalidate: Return stale cached data immediately (0ms) while background fetch updates
  if (isGet && !forceRefresh && cachedEntry && enableSwr) {
    return cachedEntry.data;
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

export async function fetchHomeBootstrap(
  branchId?: string,
  forceRefresh = false,
  onFreshData?: (data: HomeBootstrapResponse) => void
): Promise<HomeBootstrapResponse> {
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
  return fetchApiJson<HomeBootstrapResponse>(`/api/v1/home/bootstrap${query}`, undefined, {
    ttlMs: CLIENT_CACHE_TTL.HOME_BOOTSTRAP, // 180s (3 min) matching Redis Layerbase
    forceRefresh,
    swr: true,
    onFreshData,
  });
}

export async function fetchMenuBootstrap(
  branchId?: string,
  forceRefresh = false,
  onFreshData?: (data: MenuBootstrapResponse) => void
): Promise<MenuBootstrapResponse> {
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
  return fetchApiJson<MenuBootstrapResponse>(`/api/v1/menu/bootstrap${query}`, undefined, {
    ttlMs: CLIENT_CACHE_TTL.MENU_BOOTSTRAP, // 300s (5 min) matching Redis Layerbase
    forceRefresh,
    swr: true,
    onFreshData,
  });
}

export async function fetchCartBootstrap(
  forceRefresh = false,
  onFreshData?: (data: CartBootstrapResponse) => void
): Promise<CartBootstrapResponse> {
  return fetchApiJson<CartBootstrapResponse>('/api/v1/cart/bootstrap', undefined, {
    ttlMs: CLIENT_CACHE_TTL.CART_BOOTSTRAP, // 180s (3 min) matching Redis Layerbase
    forceRefresh,
    swr: true,
    onFreshData,
  });
}

export async function fetchRestaurantStatus(forceRefresh = false): Promise<any> {
  return fetchApiJson('/api/restaurant/status', undefined, {
    ttlMs: CLIENT_CACHE_TTL.RESTAURANT_STATUS, // 60s (1 min) matching Redis Layerbase
    forceRefresh,
    swr: true,
  });
}

export async function fetchCoupons(branchId?: string, forceRefresh = false): Promise<any> {
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
  return fetchApiJson(`/api/coupons${query}`, undefined, {
    ttlMs: CLIENT_CACHE_TTL.COUPONS, // 120s (2 min) matching Redis Layerbase
    forceRefresh,
    swr: true,
  });
}

export async function fetchAppConfig(appName: string, forceRefresh = false): Promise<any> {
  return fetchApiJson(`/api/config/${encodeURIComponent(appName)}`, undefined, {
    ttlMs: CLIENT_CACHE_TTL.APP_CONFIG, // 600s (10 min) matching Redis Layerbase
    forceRefresh,
    swr: true,
  });
}

export async function fetchMasterCatalog(forceRefresh = false): Promise<any> {
  return fetchApiJson('/api/menu/master-catalog', undefined, {
    ttlMs: CLIENT_CACHE_TTL.MASTER_CATALOG, // 300s (5 min) matching Redis Layerbase
    forceRefresh,
    swr: true,
  });
}

export async function fetchBranchMenu(branchId: string, forceRefresh = false): Promise<any> {
  return fetchApiJson(`/api/menu/branch/${encodeURIComponent(branchId)}`, undefined, {
    ttlMs: CLIENT_CACHE_TTL.BRANCH_MENU, // 300s (5 min) matching Redis Layerbase
    forceRefresh,
    swr: true,
  });
}

export async function fetchTrackingBootstrap(orderId: string): Promise<TrackingBootstrapResponse> {
  return fetchApiJson<TrackingBootstrapResponse>(`/api/v1/orders/${encodeURIComponent(orderId)}/tracking/bootstrap`, undefined, {
    ttlMs: 0,
    forceRefresh: true,
  });
}

