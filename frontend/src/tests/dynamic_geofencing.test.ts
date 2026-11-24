import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RESTAURANT_LOCATION,
  MAX_DELIVERY_RADIUS_KM,
  PRODUCTION_BACKEND_URL,
  getWebSocketUrl
} from '../lib/config';
import { OrderingContextService } from '../lib/orderingContext';

describe('Dynamic Geofencing & Serviceability Remediation (R2, R3)', () => {

  beforeEach(() => {
    vi.restoreAllMocks();
    OrderingContextService.clearCachedContext();
  });

  // =========================================================================
  // SUITE 1: Canonical Config & Production URLs
  // =========================================================================
  describe('Config Alignment', () => {
    it('should configure canonical Rajnandgaon HQ branch coordinates', () => {
      expect(RESTAURANT_LOCATION.lat).toBe(21.0974);
      expect(RESTAURANT_LOCATION.lng).toBe(81.0347);
    });

    it('should configure 12 km delivery radius (not 15 km or 25 km)', () => {
      expect(MAX_DELIVERY_RADIUS_KM).toBe(12);
    });

    it('should resolve fallback backend production URL to standalone backend on Render', () => {
      expect(PRODUCTION_BACKEND_URL).toBe('https://olive-pizza-backend.onrender.com');
    });

    it('should resolve WebSocket URL dynamically or fallback to standalone backend on Render', () => {
      const wsUrl = getWebSocketUrl();
      // In local dev (.env VITE_API_BASE_URL=http://localhost:5000), translates to ws://
      // In production / fallback, resolves to wss://olive-pizza-backend.onrender.com/ws
      expect(
        wsUrl === 'ws://localhost:5000/ws' ||
        wsUrl === 'wss://olive-pizza-backend.onrender.com/ws'
      ).toBe(true);
    });
  });

  // =========================================================================
  // SUITE 2: Strict Coordinate Bounds Validation (Fail Closed)
  // =========================================================================
  describe('Coordinate Bounds Validation (Fail Closed)', () => {
    it('should reject out-of-bounds latitude (> 90) and fail closed', async () => {
      const result = await OrderingContextService.resolveContext({
        lat: 91.5,
        lng: 81.0347
      });
      expect(result.isServiceable).toBe(false);
      expect(result.code).toBe('INVALID_COORDINATES');
    });

    it('should reject out-of-bounds latitude (< -90) and fail closed', async () => {
      const result = await OrderingContextService.resolveContext({
        lat: -95.0,
        lng: 81.0347
      });
      expect(result.isServiceable).toBe(false);
      expect(result.code).toBe('INVALID_COORDINATES');
    });

    it('should reject out-of-bounds longitude (> 180) and fail closed', async () => {
      const result = await OrderingContextService.resolveContext({
        lat: 21.0974,
        lng: 185.0
      });
      expect(result.isServiceable).toBe(false);
      expect(result.code).toBe('INVALID_COORDINATES');
    });

    it('should reject out-of-bounds longitude (< -180) and fail closed', async () => {
      const result = await OrderingContextService.resolveContext({
        lat: 21.0974,
        lng: -185.0
      });
      expect(result.isServiceable).toBe(false);
      expect(result.code).toBe('INVALID_COORDINATES');
    });

    it('should reject NaN and null coordinates and fail closed', async () => {
      const nanResult = await OrderingContextService.resolveContext({
        lat: NaN,
        lng: 81.0347
      });
      expect(nanResult.isServiceable).toBe(false);
      expect(nanResult.code).toBe('INVALID_COORDINATES');

      const nullResult = await OrderingContextService.resolveContext({
        lat: null as any,
        lng: 81.0347
      });
      expect(nullResult.isServiceable).toBe(false);
      expect(nullResult.code).toBe('INVALID_COORDINATES');
    });

    it('should reject invalid coordinates in validateCheckout', async () => {
      const result = await OrderingContextService.validateCheckout({
        lat: 120,
        lng: 81.0347
      });
      expect(result.serviceable).toBe(false);
      expect(result.code).toBe('INVALID_COORDINATES');
    });
  });

  // =========================================================================
  // SUITE 3: Dynamic 12 km Delivery Radius (Elimination of 25 km Fallback)
  // =========================================================================
  describe('Delivery Radius Dynamic Enforcement', () => {
    it('should approve customer location within 12 km radius (e.g. ~1.5 km away in Rajnandgaon)', async () => {
      // In node/test environment, fetch to /api fails and triggers Haversine fallback
      const insideLat = 21.105;
      const insideLng = 81.040;

      const result = await OrderingContextService.resolveContext({
        lat: insideLat,
        lng: insideLng
      });

      expect(result.isServiceable).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.context?.deliveryRadiusKm).toBe(12);
      expect(result.context?.branchId).toBe('branch_rjn_main');
      expect(result.context?.distanceKm).toBeLessThan(12);
    });

    it('should reject customer location at 18 km (which passed under obsolete 25 km rule, but must fail under 12 km)', async () => {
      // Dongargaon area (~18 km from Rajnandgaon HQ: lat 20.970, lng 80.950)
      const outsideLat = 20.970;
      const outsideLng = 80.950;

      const result = await OrderingContextService.resolveContext({
        lat: outsideLat,
        lng: outsideLng
      });

      expect(result.isServiceable).toBe(false);
      expect(result.code).toBe('OUT_OF_DELIVERY_ZONE');
      expect(result.error).toMatch(/12 km/);
    });

    it('should reject customer location outside delivery zone (New Delhi: ~900 km away)', async () => {
      const delhiLat = 28.6139;
      const delhiLng = 77.2090;

      const result = await OrderingContextService.resolveContext({
        lat: delhiLat,
        lng: delhiLng
      });

      expect(result.isServiceable).toBe(false);
      expect(result.code).toBe('OUT_OF_DELIVERY_ZONE');
    });

    it('should enforce 12 km boundary in validateCheckout', async () => {
      // Inside 12 km
      const insideResult = await OrderingContextService.validateCheckout({
        lat: 21.105,
        lng: 81.040
      });
      expect(insideResult.serviceable).toBe(true);
      expect(insideResult.branchId).toBe('branch_rjn_main');

      // Outside 12 km
      const outsideResult = await OrderingContextService.validateCheckout({
        lat: 20.970,
        lng: 80.950
      });
      expect(outsideResult.serviceable).toBe(false);
      expect(outsideResult.code).toBe('OUT_OF_DELIVERY_ZONE');
    });
  });
});
