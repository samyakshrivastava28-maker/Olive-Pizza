import { fetchApi } from './config';

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
    this.cachedContext = context;
    try {
      localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(context));
    } catch (e) {}
  }

  public static clearCachedContext(): void {
    this.cachedContext = null;
    try {
      localStorage.removeItem(CONTEXT_STORAGE_KEY);
    } catch (e) {}
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
      const res = await fetchApi('/api/franchise/ordering-context/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lng,
          addressLine,
          customerId: customerId || 'guest'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.isServiceable) {
        this.clearCachedContext();
        return {
          isServiceable: false,
          error: data.error || "We currently don't deliver to this location.",
          code: data.code || 'OUT_OF_DELIVERY_ZONE'
        };
      }

      const context: CustomerOrderingContext = data.context;
      this.setCachedContext(context);

      return {
        isServiceable: true,
        context
      };
    } catch (err: any) {
      console.warn('[OrderingContext] Resolution network notice:', err.message);
      return {
        isServiceable: false,
        error: "We currently don't deliver to this location.",
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
      const res = await fetchApi('/api/orders/validate-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await res.json();
      if (!res.ok || !data.serviceable) {
        return {
          serviceable: false,
          error: data.error || "We currently don't deliver to this location.",
          code: data.code || 'OUT_OF_DELIVERY_ZONE'
        };
      }
      return {
        serviceable: true,
        franchiseId: data.franchiseId,
        branchId: data.branchId
      };
    } catch (err: any) {
      return {
        serviceable: false,
        error: "We currently don't deliver to this location.",
        code: 'OUT_OF_DELIVERY_ZONE'
      };
    }
  }
}

