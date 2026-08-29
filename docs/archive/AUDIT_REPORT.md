# 🍕 Olive Pizza Ecosystem — Comprehensive Audit Report (AUDIT_REPORT.md)
**Date:** August 22, 2026  
**Auditor:** Antigravity Master Execution Agent  
**Baseline Git Checkpoint:** `9618216` (Clean Baseline Commit)  
**Status:** Audit Complete — Phase 0

---

## 1. Executive Summary & Verification of Architectural Assumptions

| # | Assumption | Status | Evidence & Actual State |
|---|---|---|---|
| 1 | **Shared backend exists and is used by all apps** | **PARTIAL** | Unified Express/TS backend in `olive-pizza/backend` serves API routes for customer, owner, restaurant managers, and delivery riders. `olive-pizza-owner` contains a mirrored copy, while `restaurant-management` and `delivery` connect to `DEV_BACKEND_URL` (`http://localhost:5175`) or `PRODUCTION_BACKEND_URL` (`https://olivepizza-owner.onrender.com`). Target is to strictly standardize on one shared backend instance. |
| 2 | **Firebase Authentication is the identity system** | **TRUE** | Firebase Auth (Email/Password, Google OAuth, Phone Verification via Truecaller/Fast2SMS) is active across all apps. Token verification is enforced in `auth.middleware.ts` using `adminAuth.verifyIdToken()`. |
| 3 | **Firestore holds core business data** | **TRUE** | Primary collections: `users`, `orders`, `products`, `menu_items`, `combos`, `coupons`, `settings`, `security_logs`, `franchises`, `branches`, `franchise_audit_logs`, `restaurant_managers`, `media_library`, `carts`, `reports`. |
| 4 | **PostgreSQL/Supabase holds operational/high-frequency data** | **TRUE** | Managed in `backend/src/config/postgres.ts` using `pg.Pool` & `@supabase/supabase-js`. Tables: `order_locks`, `delivery_locations`, `delivery_routes`, `delivery_history`, `email_templates`, `email_campaigns`, `email_queue`, `storage_analytics`, `storage_analytics_daily`, `payments`, `payment_sessions`, `payment_webhooks`, `refunds`. |
| 5 | **Cloudinary is configured for media** | **TRUE** | Configured via `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Reused in menu items, media library, and proof-of-delivery photos. |
| 6 | **FCM notification pipeline exists and works** | **TRUE** | Implemented via `NotificationEngine.ts`, `FCMNotificationWorker.ts`, and `PushNotificationManager.tsx`. Supports foreground/background notifications, alarm activity, and sound channels. |
| 7 | **Action/permission system exists beyond customer/owner** | **PARTIAL** | Base roles (`customer`, `owner`, `admin`, `developer`, `delivery_partner`, `restaurant_manager`, `franchise_owner`) are recognized in `auth.middleware.ts` and `FranchiseScopeService.ts`. Granular permission check middleware and strict branch-level scoping require complete hardening across POS and franchise routes. |
| 8 | **Single Order Service used by customer and POS** | **PARTIAL** | Core Order Service in `backend/src/routes/order.routes.ts` handles cart validation, pricing recalculation, idempotency locking, and order state transitions. POS application (`olive-pizza-pos`) is not yet initialized and must be built to directly consume this canonical service. |
| 9 | **Google Sheets integration does NOT yet exist** | **TRUE** | `GoogleSheetsReportService.ts` contains basic monthly order report stubs. Live transactional billing sync, franchise folder automation (Google Drive API), and idempotent bill row synchronization must be built. |
| 10 | **Franchise/branch/organization data model does NOT yet exist** | **PARTIAL** | Initial franchise hierarchy (`org_olive_pizza` $\rightarrow$ `fra_primary` $\rightarrow$ `main_branch`, `durg_branch`, `bhilai_branch`, `raipur_branch`) was defined in `franchise.routes.ts` & `FranchiseScopeService.ts`. Must be fully migrated, indexed, and enforced on all order/product/billing queries. |

---

## 2. Service Inventory: Keep, Replace, Build

### 2.1 Keep (Working Systems — Do Not Rewrite)
- **Firebase Auth & Token Verification**: `backend/src/middleware/auth.middleware.ts`, `frontend/src/components/AuthProvider.tsx`.
- **Truecaller & Fast2SMS Verification Pipeline**: `backend/src/services/phone-verification/`, native Android `TruecallerPlugin.java`.
- **NVIDIA Chatterbox Multilingual Neural TTS Proxy**: `backend/src/routes/tts.routes.ts`.
- **3D Vector Map & Navigation Subsystem**: `UniversalMap3D.tsx`, MapLibre GL, OpenFreeMap.
- **FCM High-Priority Order Alarms & Android Fullscreen Alarms**: `android/`, `PushNotificationManager.tsx`.
- **PostgreSQL Concurrency Locking & Telemetry**: `order_locks`, `delivery_locations` realtime broadcast.
- **Cloudinary Media Upload & Optimization**: `CloudinaryService.ts`.
- **HomePage Template Engine**: `homePageManager.routes.ts`, `HomePageTemplates.ts`.

### 2.2 Replace / Harden
- **Scattered Owner/Manager Backend Copies**: Unify into the single master backend (`olive-pizza/backend`).
- **Client-Side Pricing & Scope Assumptions**: Enforce strict server-side recalculation of order items, taxes, discounts, delivery fees, and branch/franchise ownership.
- **Manual Sheet Creation**: Replace static spreadsheet config with automated folder-per-franchise and monthly sheet lifecycle.

### 2.3 Build (New Modules & Surfaces)
- **POS / Billing Application (`olive-pizza-pos`)**: High-speed touch POS for dine-in, takeaway, and delivery, shared Order Service integration, offline resilience, and receipt printing.
- **Google Sheets Live Billing Sync Engine**: Drive folder structure per franchise, automatic monthly sheet creation, async background sync with idempotency keys.
- **Franchise Management Scoped Interface**: Scoped view for franchise owners to monitor branches, managers, delivery fleet, and sales without platform owner privileges.
- **100m Delivery Completion Rule Server Enforcement**: Server-side Haversine distance verification on `POST /delivery/rider/orders/:id/complete`.
- **Automated Data Retention & Lifecycle Aggregation**: Month-boundary aggregation and purge of temporary telemetry.

---

## 3. High-Risk Regression Areas (Extreme Caution Required)

1. **SMS & Phone Verification (Fast2SMS / Truecaller)**:
   - *Risk*: Modifying auth flow can break login for mobile users.
   - *Policy*: Do not touch provider credentials or core cryptographic validation unless proven defective.
2. **FCM Notifications & Continuous Android Alarms**:
   - *Risk*: Breaking custom Android notification channels (`olive_order_new`) or background alarm handlers.
   - *Policy*: Retain payload structures, priority headers, and sound resource bindings.
3. **Intro Video & Animations**:
   - *Risk*: Regressions in PWA/Capacitor webview rendering.
   - *Policy*: Keep lazy-loading fallback gates intact.
4. **Order Status Lifecycle**:
   - *Risk*: Mismatch between frontend state machines and backend Firestore status.
   - *Policy*: Canonical status enum: `pending` $\rightarrow$ `accepted` $\rightarrow$ `preparing` $\rightarrow$ `ready` $\rightarrow$ `partner_assigned` $\rightarrow$ `picked_up` $\rightarrow$ `out_for_delivery` $\rightarrow$ `delivered` / `cancelled`.

---

## 4. Current Concrete Data Models

### 4.1 Order Model (`orders` in Firestore)
```typescript
interface Order {
  id: string;                          // UUID
  dailyOrderNumber?: number;           // Atomic daily counter (#1, #2, ...)
  orderDateLocal?: string;             // YYYY-MM-DD
  organizationId: string;              // 'org_olive_pizza'
  franchiseId: string;                 // 'fra_primary'
  branchId: string;                    // 'main_branch'
  userId: string;                      // Firebase Auth UID
  customerName: string;
  contactPhone: string;
  items: CartItem[];                   // Validated item list
  subtotal: number;                    // Server-calculated
  taxes: number;                       // 5% GST
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;                 // Final payable
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'partner_assigned' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled';
  orderSource: 'ONLINE' | 'POS_DINE_IN' | 'POS_TAKEAWAY' | 'POS_DELIVERY';
  deliveryType: 'delivery' | 'pickup' | 'dine_in';
  deliveryAddress?: {
    addressLine: string;
    lat?: number;
    lng?: number;
    landmark?: string;
    instructions?: string;
  };
  deliveryPartnerId?: string;
  paymentMethod: 'COD' | 'UPI' | 'ONLINE' | 'CARD' | 'CASH';
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}
```

### 4.2 User & Staff Model (`users` in Firestore)
```typescript
interface User {
  id: string;                          // UID
  email?: string;
  name?: string;
  phone?: string;
  phoneVerified?: boolean;
  role: 'customer' | 'owner' | 'platform_admin' | 'franchise_owner' | 'restaurant_manager' | 'delivery_partner' | 'cashier' | 'developer';
  organizationId?: string;
  franchiseId?: string;
  branchId?: string;
  branchIds?: string[];
  permissions?: string[];
  isActive: boolean;
  lat?: number;
  lng?: number;
  fullAddress?: string;
}
```

---

## 5. Next Steps
Proceeding to create `implementation_plan.md` for User Review covering Phases 1 through 18.
