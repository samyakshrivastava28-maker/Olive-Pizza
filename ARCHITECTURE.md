# 🍕 Olive Pizza Ecosystem — Architecture Specification (v2.1)

## 1. Executive Architecture Overview

The Olive Pizza platform is a multi-tenant, enterprise-grade food commerce and restaurant management ecosystem spanning **seven distinct application surfaces** powered by **one central canonical backend**:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     OLIVE PIZZA CANONICAL BACKEND                                      │
│                        (Node.js / TypeScript / Express / Firestore / Supabase Postgres)                 │
└────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬────────────────┘
             │              │              │              │              │              │
             ▼              ▼              ▼              ▼              ▼              ▼
     ┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
     │ CUSTOMER APP ││  OWNER APP   ││  FRANCHISE   ││  RESTAURANT  ││   DELIVERY   ││   POS APP    │
     │  & WEBSITE   ││  & WEBSITE   ││  MANAGEMENT  ││ MANAGER APP  ││ PARTNER APP  ││ (PORT 5178)  │
     │ (PORT 5173)  ││ (PORT 5174)  ││ (SCOPED VIEW)││ (PORT 5176)  ││ (PORT 5177)  ││              │
     └──────────────┘└──────────────┘└──────────────┘└──────────────┘└──────────────┘└──────────────┘
```

---

## 2. Separate Application Surfaces & Repositories

| Application Surface | Directory / Project | Local Port | Target Audience | Primary Functionality |
|---|---|---|---|---|
| **Customer App & Web** | `olive-pizza/frontend` | `5173` | End Customers | Dynamic menu, pizza customizer, cart, checkout, live 3D tracking, account deletion. |
| **Owner App & Web** | `olive-pizza-owner` | `5174` | Brand Owners | High-level analytics, live orders, fleet radar, media library, reports, Home Page CMS. |
| **Franchise Management** | `olive-pizza-owner` (Scoped) | `5174` | Franchise Owners | Multi-branch provisioning, regional menu overrides, franchise billing folders. |
| **Restaurant Manager** | `olive-pizza-restaurant-management` | `5176` | Store Managers | 6-page dashboard: Live Orders, Order History, Notifications, Email, Delivery Management. |
| **Delivery Partner App** | `olive-pizza-delivery` | `5177` | Delivery Riders | Order assignments, 3D turn-by-turn navigation, strict 100m proximity verification. |
| **POS Billing Software** | `olive-pizza-pos` | `5178` | Store Cashiers | Touch billing grid, dine-in table management, thermal printing, split payments. |
| **AI Intelligence Layer** | `Olive Pizza AI` | N/A | AI Assistants | Separate specialized AI reasoning, customer assistance, knowledge indexing. |

---

## 3. Dual-Database Data Strategy

### 3.1 Primary Business Truth: Google Cloud Firestore
- Master record of all persistent business entities:
  - `users` (profiles, addresses, authentication records)
  - `orders` (canonical order documents with status, items, timing, pricing)
  - `products` & `menu_items` (dishes, sizes, crusts, addons, prices)
  - `coupons` (discount codes, expiry dates, minimum orders, usage counts)
  - `franchises` & `branches` (regional hierarchy, delivery geofence radius)
  - `delivery_partners` (rider fleet roster, vehicle details, online status)
  - `deletion_requests` (GDPR compliance with 30-day grace period)
  - `homepage_configs` (CMS templates for website home page)

### 3.2 High-Frequency Operational Data: Supabase PostgreSQL
- Manages high-throughput operational and transactional data:
  - `delivery_locations` (real-time rider GPS telemetry streamed via Supabase Realtime)
  - `checkout_locks` (prevents double-billing and concurrent duplicate checkouts)
  - `payments` & `payment_webhooks` (idempotent payment verification and reconciliation)
  - `email_queue` (transactional email background worker queue)

---

## 4. Multi-Tenant Franchise Hierarchy

```
Organization: org_olive_pizza
  └── Franchise: fra_primary (Chhattisgarh Central Region)
        ├── Branch: main_branch (Rajnandgaon HQ)
        │     ├── Managers
        │     ├── Assigned Delivery Fleet
        │     ├── POS Terminals (pos_term_01, pos_term_02)
        │     └── Shared Kitchen Queue
        ├── Branch: durg_branch (Durg)
        ├── Branch: bhilai_branch (Bhilai)
        └── Branch: raipur_branch (Raipur)
```

---

## 5. Centralized Order Pipeline & Lifecycle

```
[Customer App / POS Billing / Phone]
                │
                ▼
     [POST /api/orders]
                │
   ┌────────────┴────────────────────────┐
   │ 1. Server-side price recalculation  │
   │ 2. Server-side coupon verification  │
   │ 3. Operating hours validation       │
   │ 4. 5% GST tax computation           │
   │ 5. Tag orderSource (ONLINE/POS)     │
   └────────────┬────────────────────────┘
                ▼
     [Save to Firestore & Postgres]
                │
   ┌────────────┴────────────────────────┐
   │ 1. Instant response to client       │
   │ 2. Release checkout lock            │
   │ 3. Alert Owner & Kitchen Board      │
   │ 4. Queue transactional email        │
   │ 5. Queue Google Sheets Sync Worker  │
   └─────────────────────────────────────┘
```

---

## 6. Strict 100-Meter Delivery Geofence Rule

- Implemented strictly in `riderDelivery.routes.ts` and `ecosystem_verification.test.ts`.
- Server calculates spherical Haversine distance between rider GPS coordinates and customer address coordinates.
- **Rule**: `distance <= 100 meters` required.
- Any completion attempt $> 100\text{m}$ away is strictly rejected with `HTTP 400 Bad Request`.
