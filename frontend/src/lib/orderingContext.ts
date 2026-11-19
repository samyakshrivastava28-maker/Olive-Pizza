import { fetchApi, RESTAURANT_LOCATION, MAX_DELIVERY_RADIUS_KM } from './config';
import { invalidateMenuCache, invalidateBootstrapCache } from './api';
import { GeohashService } from '../services/location/GeohashService';

export interface CustomerOrderingContext {
  customerId: string;
  franchiseId: string;
  branchId: string;
  branchName: string;
  location: {
    lat: number;
    lng: number;
    addressLine?: string;
  };
  distanceKm: number;
  deliveryRadiusKm: number;
  deliveryFee?: number;
  geohash?: string;
  version: number;
  resolvedAt: string;
  expiresAt: number;
}

const CONTEXT_STORAGE_KEY = 'olive_pizza_ordering_context';

export class OrderingContextService {
  private static cachedContext: CustomerOrderingContext | null = null;

  public static getCachedContext(): CustomerOrderingContext | null {
    if (this.cachedContext) {
      if (Date.now() < this.cachedContext.expiresAt) {
        return this.cachedContext;
      }
      this.cachedContext = null;
    }

    try {
      const stored = localStorage.getItem(CONTEXT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CustomerOrderingContext;
        if (Date.now() < parsed.expiresAt) {
          this.cachedContext = parsed;
          return parsed;
        }
        localStorage.removeItem(CONTEXT_STORAGE_KEY);
      }
    } catch (e) {
      // Storage unavailable or corrupted
    }
    return null;
  }

  public static setCachedContext(context: CustomerOrderingContext): void {
    const previousBranchId = this.cachedContext?.branchId;
    this.cachedContext = context;
    try {
      localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(context));
    } catch (e) {}
    if (previousBranchId !== context.branchId) {
      invalidateMenuCache(context.branchId);
      invalidateBootstrapCache();
    }
  }

  public static clearCachedContext(): void {
    this.cachedContext = null;
    try {
      localStorage.removeItem(CONTEXT_STORAGE_KEY);
    } catch (e) {}
    invalidateBootstrapCache();
  }

  /**
   * Resolves the authoritative ordering context from the backend using GPS coordinates.
   */
  public static async resolveContext(params: {
    lat: number;
    lng: number;
    addressLine?: string;
    customerId?: string;
  }): Promise<{
    isServiceable: boolean;
    context?: CustomerOrderingContext;
    error?: string;
    code?: string;
  }> {
    const { lat, lng, addressLine, customerId } = params;

    // Strict coordinate validation: Fail closed if coordinates are missing, non-numeric, or out of bounds (-90 to 90, -180 to 180)
    if (
      lat == null ||
      lng == null ||
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      this.clearCachedContext();
      return {
        isServiceable: false,
        error: 'Invalid coordinates provided for delivery location resolution.',
        code: 'INVALID_COORDINATES'
      };
    }

    try {
      let res: any;
      try {
        res = await fetchApi('/api/location/serviceability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat,
            lng,
            addressLine,
            customerId: customerId || 'guest'
          })
        });
      } catch (firstErr: any) {
        if (firstErr?.status === 404 || firstErr?.message?.includes('404')) {
          res = await fetchApi('/api/franchise/ordering-context/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat,
              lng,
              addressLine,
              customerId: customerId || 'guest'
            })
          });
        } else {
          throw firstErr;
        }
      }

      let data = typeof res?.json === 'function' ? await res.json().catch(() => null) : res;
      if (!res?.ok && (!data || res?.status >= 500 || res?.status === 404)) {
        throw new Error(data?.error || `Server responded with status ${res?.status || 500}`);
      }

      const isServiceable = Boolean(data?.isServiceable ?? data?.serviceable ?? data?.success);

      if (!isServiceable) {
        // Fail closed if server explicitly declares location outside delivery zone or unserviceable
        this.clearCachedContext();
        return {
          isServiceable: false,
          error: data?.error || "We currently don't deliver to this location. Available for Takeaway!",
          code: data?.code || 'OUT_OF_DELIVERY_ZONE'
        };
      }

      const context: CustomerOrderingContext = data.context || data;
      // Fail closed if branch resolution fails or branch is missing
      if (!context || !context.branchId || !context.franchiseId) {
        this.clearCachedContext();
        return {
          isServiceable: false,
          error: 'Branch resolution failed. No active operational branch resolved for this location.',
          code: 'BRANCH_RESOLUTION_FAILED'
        };
      }

      if (!context.geohash) {
        context.geohash = GeohashService.encode(lat, lng, 6);
      }
      this.setCachedContext(context);

      return {
        isServiceable: true,
        context
      };
    } catch (err: any) {
      console.warn('[OrderingContext] Network resolution notice:', err?.message || err);

      // Fail closed if coordinates are out of bounds or invalid
      if (
        lat == null ||
        lng == null ||
        typeof lat !== 'number' ||
        typeof lng !== 'number' ||
        isNaN(lat) ||
        isNaN(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        this.clearCachedContext();
        return {
          isServiceable: false,
          error: 'Invalid coordinates provided for delivery location resolution.',
          code: 'INVALID_COORDINATES'
        };
      }

      // Dynamic Geofencing: Use configured active branch delivery radius (12 km canonical)
      const activeRadiusKm = MAX_DELIVERY_RADIUS_KM || 12;

      // Resilient Client-Side Geohash & Haversine Distance Fallback
      // Never use hardcoded 25 km; uses configured active branch delivery radius (12 km canonical)
      const KNOWN_BRANCHES = [
        {
          id: 'branch_rjn_main',
          franchiseId: 'fra_rajnandgaon',
          name: 'Olive Pizza (Rajnandgaon HQ)',
          lat: RESTAURANT_LOCATION.lat,
          lng: RESTAURANT_LOCATION.lng,
          maxRadiusKm: activeRadiusKm
        }
      ];

      if (!KNOWN_BRANCHES || KNOWN_BRANCHES.length === 0) {
        this.clearCachedContext();
        return {
          isServiceable: false,
          error: 'Branch resolution failed. No active delivery branch found.',
          code: 'BRANCH_RESOLUTION_FAILED'
        };
      }

      let closestBranch: (typeof KNOWN_BRANCHES)[0] | null = null;
      let minDistance = Infinity;

      for (const branch of KNOWN_BRANCHES) {
        if (!branch.lat || !branch.lng || isNaN(branch.lat) || isNaN(branch.lng)) continue;
        const dist = GeohashService.haversineDistanceKm(lat, lng, branch.lat, branch.lng);
        if (dist < minDistance) {
          minDistance = dist;
          closestBranch = branch;
        }
      }

      // Fail closed if branch resolution fails
      if (!closestBranch || !isFinite(minDistance)) {
        this.clearCachedContext();
        return {
          isServiceable: false,
          error: 'Branch resolution failed. Could not determine closest operational branch.',
          code: 'BRANCH_RESOLUTION_FAILED'
        };
      }

      const clientGeohash = GeohashService.encode(lat, lng, 6);

      if (minDistance <= closestBranch.maxRadiusKm) {
        // Customer IS inside configured serviceable radius! Deliverable!
        const fallbackContext: CustomerOrderingContext = {
          customerId: customerId || 'guest',
          franchiseId: closestBranch.franchiseId,
          branchId: closestBranch.id,
          branchName: closestBranch.name,
          location: {
            lat,
            lng,
            addressLine: addressLine || ''
          },
          distanceKm: Math.round(minDistance * 100) / 100,
          deliveryRadiusKm: closestBranch.maxRadiusKm,
          deliveryFee: minDistance > 5 ? 40 : 30,
          geohash: clientGeohash,
          version: Date.now(),
          resolvedAt: new Date().toISOString(),
          expiresAt: Date.now() + (30 * 60 * 1000)
        };

        this.setCachedContext(fallbackContext);
        return {
          isServiceable: true,
          context: fallbackContext
        };
      }

      // Outside delivery zone - fail closed
      this.clearCachedContext();
      const safeError = `Your location is ${Math.round(minDistance * 10) / 10} km from ${closestBranch.name} (delivery available up to ${closestBranch.maxRadiusKm} km). Store pickup and takeaway are available!`;
      return {
        isServiceable: false,
        error: safeError,
        code: 'OUT_OF_DELIVERY_ZONE'
      };
    }
  }

  /**
   * Validates checkout viability and delivery radius authoritatively before entering review/payment.
   */
  public static async validateCheckout(params: {
    lat: number;
    lng: number;
    address?: string;
    items?: any[];
  }): Promise<{
    serviceable: boolean;
    franchiseId?: string;
    branchId?: string;
    error?: string;
    code?: string;
  }> {
    // Fail closed if coordinates are missing, non-numeric, or out of bounds (-90 to 90, -180 to 180)
    if (
      params.lat == null ||
      params.lng == null ||
      typeof params.lat !== 'number' ||
      typeof params.lng !== 'number' ||
      isNaN(params.lat) ||
      isNaN(params.lng) ||
      params.lat < -90 ||
      params.lat > 90 ||
      params.lng < -180 ||
      params.lng > 180
    ) {
      return {
        serviceable: false,
        error: 'Invalid coordinates provided for delivery location resolution.',
        code: 'INVALID_COORDINATES'
      };
    }

    try {
      const res: any = await fetchApi('/api/orders/validate-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = typeof res?.json === 'function' ? await res.json().catch(() => res) : res;
      if (res?.ok && Boolean(data?.serviceable ?? data?.isServiceable ?? data?.success)) {
        return {
          serviceable: true,
          franchiseId: data.franchiseId || data.context?.franchiseId,
          branchId: data.branchId || data.context?.branchId
        };
      }

      // If server explicitly declared location out of zone or resolution failed
      if (
        data?.code === 'OUT_OF_DELIVERY_ZONE' ||
        data?.code === 'BRANCH_RESOLUTION_FAILED' ||
        data?.code === 'INVALID_COORDINATES' ||
        (!res?.ok && res?.status === 400 && data?.error)
      ) {
        return {
          serviceable: false,
          error: data?.error || "We currently don't deliver to this location.",
          code: data?.code || 'OUT_OF_DELIVERY_ZONE'
        };
      }

      // If endpoint returned 404 or transient server error, validate via resolveContext
      const resolved = await this.resolveContext({
        lat: params.lat,
        lng: params.lng,
        addressLine: params.address
      });
      if (resolved.isServiceable && resolved.context) {
        return {
          serviceable: true,
          franchiseId: resolved.context.franchiseId,
          branchId: resolved.context.branchId
        };
      }
      return {
        serviceable: false,
        error: resolved.error || "We currently don't deliver to this location.",
        code: resolved.code || 'OUT_OF_DELIVERY_ZONE'
      };
    } catch (err: any) {
      // Fallback to resolveContext validation
      const resolved = await this.resolveContext({
        lat: params.lat,
        lng: params.lng,
        addressLine: params.address
      });
      if (resolved.isServiceable && resolved.context) {
        return {
          serviceable: true,
          franchiseId: resolved.context.franchiseId,
          branchId: resolved.context.branchId
        };
      }
      return {
        serviceable: false,
        error: resolved.error || "We currently don't deliver to this location.",
        code: resolved.code || 'OUT_OF_DELIVERY_ZONE'
      };
    }
  }
}

