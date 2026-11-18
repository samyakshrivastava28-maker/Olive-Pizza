import { fetchApi, RESTAURANT_LOCATION } from './config';
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
        // If server explicitly verified that customer is outside all active delivery radii:
        if (data?.code === 'OUT_OF_DELIVERY_ZONE' || data?.error?.includes('away from') || data?.error?.includes('radius')) {
          this.clearCachedContext();
          return {
            isServiceable: false,
            error: data.error || "We currently don't deliver to this location. Available for Takeaway!",
            code: 'OUT_OF_DELIVERY_ZONE'
          };
        }
        // Otherwise, server failure/glitch -> let resilient Haversine fallback verify!
        throw new Error(data?.error || "We currently don't deliver to this location.");
      }

      const context: CustomerOrderingContext = data.context || data;
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

      // Resilient Client-Side Geohash & Haversine Distance Fallback
      // Never falsely declare out-of-delivery-zone on network glitches or Render cold-starts
      const KNOWN_BRANCHES = [
        { id: 'branch_rjn_main', franchiseId: 'fra_rajnandgaon', name: 'Olive Pizza (Rajnandgaon HQ)', lat: 21.0974, lng: 81.0347, maxRadiusKm: 25 }
      ];

      let closestBranch = KNOWN_BRANCHES[0];
      let minDistance = Infinity;

      for (const branch of KNOWN_BRANCHES) {
        const dist = GeohashService.haversineDistanceKm(lat, lng, branch.lat, branch.lng);
        if (dist < minDistance) {
          minDistance = dist;
          closestBranch = branch;
        }
      }

      const clientGeohash = GeohashService.encode(lat, lng, 6);

      if (minDistance <= closestBranch.maxRadiusKm) {
        // Customer IS inside serviceable radius! Deliverable!
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

      // Truly outside delivery zone
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

      // If server explicitly declared location out of zone
      if (data?.code === 'OUT_OF_DELIVERY_ZONE' || (!res?.ok && res?.status === 400 && data?.error)) {
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

