/**
 * ClientDataCache — High-Performance Stale-While-Revalidate Client Caching Layer
 * 
 * Provides:
 * - Instant (0ms) synchronous reads from Memory / LocalStorage on app startup
 * - Request deduplication (coalesces identical in-flight network requests)
 * - Automatic background revalidation (Stale-While-Revalidate)
 * - Scope isolation: Public data (menu, categories, offers, branches) vs User data (profile, orders)
 * - Safe TTL management with manual & pattern-based cache invalidation
 */

interface CacheRecord<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  etag?: string;
}

// In-memory hot cache
const memoryCache = new Map<string, CacheRecord<any>>();

// In-flight promise tracker for request coalescing / deduplication
const inFlightRequests = new Map<string, Promise<any>>();

// Default TTLs (in milliseconds)
export const CACHE_TTL = {
  REALTIME: 30 * 1000,        // 30 seconds
  SHORT: 2 * 60 * 1000,       // 2 minutes
  STANDARD: 5 * 60 * 1000,    // 5 minutes (menu, categories)
  LONG: 30 * 60 * 1000,       // 30 minutes (branches, static settings)
  PERSISTENT: 24 * 60 * 60 * 1000, // 24 hours (cities, layout templates)
};

const STORAGE_PREFIX = 'op_cache_';

export class ClientDataCache {
  /**
   * Constructs an identity-isolated cache key for private user data
   */
  public static userKey(uid: string, subKey: string): string {
    return `customer:${uid}:${subKey}`;
  }

  /**
   * Constructs a shared cache key for public restaurant data
   */
  public static publicKey(subKey: string): string {
    return `public:${subKey}`;
  }

  /**
   * Synchronous retrieval from in-memory cache or localStorage
   */
  public static get<T>(key: string): T | null {
    // 1. Check hot memory cache
    const mem = memoryCache.get(key);
    if (mem) {
      if (Date.now() < mem.expiresAt) {
        return mem.data;
      }
      // Stale data is still valid for immediate SWR rendering
      return mem.data;
    }

    // 2. Fall back to localStorage for instant startup restore
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
        if (raw) {
          const parsed: CacheRecord<T> = JSON.parse(raw);
          // Populate memory cache
          memoryCache.set(key, parsed);
          return parsed.data;
        }
      } catch {
        // Non-fatal parse failure
      }
    }

    return null;
  }

  /**
   * Checks if cached item is strictly within its fresh TTL
   */
  public static isFresh(key: string): boolean {
    const mem = memoryCache.get(key);
    if (mem) {
      return Date.now() < mem.expiresAt;
    }
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          return Date.now() < (parsed.expiresAt || 0);
        }
      } catch {}
    }
    return false;
  }

  /**
   * Saves data into memory and optionally persists to localStorage
   */
  public static set<T>(key: string, data: T, ttlMs: number = CACHE_TTL.STANDARD, persistToStorage: boolean = true): void {
    const now = Date.now();
    const record: CacheRecord<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttlMs,
    };

    memoryCache.set(key, record);

    if (persistToStorage && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(record));
      } catch {
        // In case of quota exceeded, gracefully ignore
      }
    }
  }

  /**
   * High-Performance Stale-While-Revalidate execution:
   * 1. Returns cached data immediately if available (0ms)
   * 2. Deduplicates concurrent calls to the same fetcher
   * 3. Triggers background revalidation if data is stale
   * 4. Calls onFreshData callback if background revalidation brings changed data
   */
  public static async fetchWithSWR<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
      ttlMs?: number;
      persist?: boolean;
      onFreshData?: (fresh: T) => void;
    }
  ): Promise<T> {
    const ttl = options?.ttlMs ?? CACHE_TTL.STANDARD;
    const persist = options?.persist ?? true;
    const cachedData = this.get<T>(key);
    const isStillFresh = this.isFresh(key);

    // If we have cached data and it's strictly fresh, return it directly
    if (cachedData !== null && isStillFresh) {
      return cachedData;
    }

    // Coalesce duplicate in-flight requests into a single promise
    const inFlight = inFlightRequests.get(key);
    if (inFlight) {
      if (cachedData !== null) {
        // Return stale data immediately; in-flight promise will update cache in background
        return cachedData;
      }
      return inFlight;
    }

    // Launch fetcher
    const fetchPromise = (async () => {
      try {
        const freshData = await fetcher();
        if (freshData !== undefined && freshData !== null) {
          this.set(key, freshData, ttl, persist);
          if (options?.onFreshData) {
            try {
              options.onFreshData(freshData);
            } catch (err) {
              console.warn(`[ClientDataCache] onFreshData handler error for ${key}:`, err);
            }
          }
        }
        return freshData;
      } finally {
        inFlightRequests.delete(key);
      }
    })();

    inFlightRequests.set(key, fetchPromise);

    // If we have stale cached data, return it immediately (0ms SWR) while fetcher runs in background
    if (cachedData !== null) {
      return cachedData;
    }

    return fetchPromise;
  }

  /**
   * Invalidate a specific cache key
   */
  public static invalidate(key: string): void {
    memoryCache.delete(key);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      } catch {}
    }
  }

  /**
   * Invalidate all keys matching a prefix or pattern
   */
  public static invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    
    // In-memory
    for (const key of memoryCache.keys()) {
      if (regex.test(key)) {
        memoryCache.delete(key);
      }
    }

    // LocalStorage
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) {
            const bareKey = k.replace(STORAGE_PREFIX, '');
            if (regex.test(bareKey)) {
              keysToRemove.push(k);
            }
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch {}
    }
  }

  /**
   * Purges all private user cache on logout
   */
  public static clearUserCache(uid?: string): void {
    if (uid) {
      this.invalidatePattern(`^customer:${uid}:`);
    } else {
      this.invalidatePattern('^customer:');
    }
  }
}

export const clientDataCache = ClientDataCache;
