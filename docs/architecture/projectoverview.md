# 🍕 Olive Pizza Ecosystem — Comprehensive Project Overview & Architecture Guide

> **Current Production Backend**: `https://olive-pizza-backend.onrender.com` | **Dev Backend**: `http://localhost:5000`  
> **Architecture Model**: Six Independent Client Applications ➔ One Shared Canonical Backend

---

## 1. Ecosystem Topology & Port Mapping

The Olive Pizza platform operates on a single canonical backend model serving six distinct, independently deployable client applications with unified authentication, realtime events, and multi-tenant scoping:

```
                                 OLIVE PIZZA CENTRAL BACKEND
                                      (Port 5000 / API)
                                              │
                 ┌────────────────────────────┼────────────────────────────┐
                 ▼                            ▼                            ▼
            [FIRESTORE]              [SUPABASE POSTGRES]          [OPERATIONAL POSTGRES]
        App State & Catalog           Live GPS Navigation           Payments & Queues
                 │                            │                            │
                 │                            ▼                            │
                 │                      WebSocket (/ws)                    │
                 │                            │                            │
                 └────────────────────────────┼────────────────────────────┘
                                              │
       ┌───────────┬──────────────┬───────────┴───┬──────────────┬───────────┐
       │           │              │               │              │           │
       ▼           ▼              ▼               ▼              ▼           ▼
   Customer      Owner        Franchise       Restaurant      Delivery      POS
     :3000       :5174          :5175           :5176          :5177       :5178
```

| Application / Service | Repository Directory | Port | Primary Consumers & Role |
| :--- | :--- | :---: | :--- |
| **Central Backend** | `olive-pizza-owner/backend` | **5000** | Authoritative business logic, authentication, database transactions, WebSockets |
| **Customer App** | `olive-pizza` | **3000** | Customers (Web, Android Capacitor PWA) — Ordering, Live Tracking, AI Assistant |
| **Owner Console** | `olive-pizza-owner/frontend` | **5174** | Global Platform Owner (`olivepizzarjn@gmail.com`) — Analytics, SDUI, Central Provisioning |
| **Franchise Suite** | `olive-pizza-franchise` | **5175** | Franchise Owners — Multi-branch revenue, staff account control, POS terminal provisioning |
| **Restaurant Manager**| `Olive Pizza restaurant manager` | **5176** | Branch Managers & Kitchen Staff — KDS live queue, status transitions, local inventory |
| **Delivery Partner** | `olive-pizza-delivery` | **5177** | Riders / Drivers — Task assignments, turn-by-turn navigation, GPS broadcasting |
| **POS Billing** | `olive-pizza-pos` | **5178** | In-Store Cashiers — Dine-In, Takeaway, ESC/POS thermal printing, dual persistence |

---

## 2. Detailed Workings of All 6 Applications & Central Backend

### 1. Customer Application (`olive-pizza` — Port 3000)
* **Target Users**: Consumers ordering food online via mobile browser or Android APK.
* **Core Workings & Features**:
  * **Interactive Visual Menu**: Responsive category capsules, pizza size toggles (8", 10", 12"), crust options (Hand-Tossed, Thin & Crispy, Cheese Burst), and paid add-ons.
  * **Cart & Floating Tracker**: Framer Motion spring physics animations, live badge updates, persistent local caching, and non-blocking state transitions.
  * **Live 3D Order Tracking (`OrderTracking.tsx`)**: 60fps rider marker interpolation on MapLibre 3D vector maps powered by the backend WebSocket server (`/ws`) and Supabase GPS telemetry.
  * **Multi-Gateway Checkout**: Support for Cashfree, PhonePe, Razorpay, UPI QR, and Cash on Delivery with server-side price validation.
  * **Pinned Android Notifications**: FCM data payloads triggering background alarms and live system-tray updates.

---

### 2. Owner Platform (`olive-pizza-owner/frontend` — Port 5174)
* **Target Users**: Global Platform Owner (`olivepizzarjn@gmail.com`, `webhub2811@gmail.com`).
* **Core Workings & Features**:
  * **Central Franchise Management (`/franchises`)**:
    * 7-Step Multi-Tenancy Provisioning Wizard (Franchise details, Owner account, Branch parameters, Manager account, Map GPS picker, POS terminal count, Review & atomic provisioning).
    * Scoped Context Launchers: One-click launching into standalone Franchise Suite (Port 5175) or Restaurant KDS (Port 5176) with server-authorized temporary context tokens (`POST /api/auth/context-session`).
  * **SDUI Home Page Manager (`/home-manager`)**: Visual drag-and-drop designer for banner carousels, promo capsules, and feature sections with live preview and Firestore deployment.
  * **Product & Menu Management (`/products`)**: Product catalog management with AI prompt enhancement (DeepSeek V4 Flash) and image generation (Qwen Image / FLUX).
  * **Emergency Live Order Alarm**: Continuous audio alarm loop for incoming orders requiring immediate attention.
  * **Executive Analytics & Reporting (`/analytics`, `/reports`)**: Multi-channel revenue breakdowns, Looker Studio analytics embed, and Google Sheets integration.

---

### 3. Canonical Central Backend (`olive-pizza-owner/backend` — Port 5000)
* **Role**: Single authoritative source of truth for the entire platform.
* **Core Workings & Services**:
  * **Identity & Scoping Engine (`FranchiseScopeService.ts`)**: Server-side enforcement of branch, franchise, and terminal permissions. Regular staff are strictly locked to their assigned branch; Global Owner possesses platform-wide access.
  * **Canonical Order State Machine (`OrderStateMachine.ts`)**: 16 certified lifecycle transitions with strict invariant verification, concurrency locks (`order_locks`), and audit logging.
  * **Central Notification Engine (`NotificationEngine.ts`)**: Multicast push notifications, Fast2SMS OTP gateway integration, transactional email queues, and WebSocket event broadcasts.
  * **WebSocket Server (`WebSocketServer.ts`)**: Real-time bidirectional streaming on `/ws` for live GPS coordinates (< 5ms latency), kitchen order alerts, and driver departure reminders.
  * **Automated Data Retention Worker (`DataRetentionJob.ts`)**: Minutely sweep enforcing the 5-minute raw GPS telemetry retention rule while preserving permanent financial and order records.

---

### 4. Franchise Management Suite (`olive-pizza-franchise` — Port 5175)
* **Target Users**: Regional Franchise Owners & Administrators.
* **Core Workings & Features**:
  * **Multi-Branch Operations**: Real-time monitoring of all authorized branches under the franchise.
  * **Staff & Device Control**: Provisioning of restaurant managers, cashiers, delivery partners, and POS terminal hardware authorizations.
  * **Top-Bar Global Owner Switcher**: Dynamic dropdown `Current Franchise: [Franchise Name ▼]` with a `[Back to Owner Console]` button when accessed by Global Owners; locked for regional franchise owners.
  * **Consolidated Financial Reports**: Revenue aggregation across branches with tax breakdowns (CGST + SGST) and payment method analysis.

---

### 5. Restaurant Operations Console & Kitchen KDS (`Olive Pizza restaurant manager` — Port 5176)
* **Target Users**: Store Branch Managers, Kitchen Chefs, and Expeditors.
* **Core Workings & Features**:
  * **Live Orders Board (`LiveOrdersPage.tsx`)**: Real-time queue showing active kitchen tickets across `pending`, `preparing`, `ready`, and `out_for_delivery` with 1-click status advancing.
  * **Dual-Channel Data Synchronization**: Real-time Firestore `onSnapshot` streaming paired with an automatic HTTP polling fallback (`/orders/live?branchId=...`) to ensure zero dropped tickets.
  * **Raw Material & Kitchen Inventory (`/kitchen`)**: Tracking for raw materials (Mozzarella, Dough, Sauce) and packaging (Boxes, Cups) with low-stock push alerts.
  * **Delivery Fleet Dispatch (`/delivery`)**: Real-time rider radar tracking, delivery partner assignment, and dispatch management.
  * **Top-Bar Branch Context Switcher**: Global Owners can switch store context on the fly; branch managers remain locked to their assigned store.

---

### 6. Delivery Partner Application (`olive-pizza-delivery` — Port 5177)
* **Target Users**: Delivery Riders & Fleet Drivers.
* **Core Workings & Features**:
  * **Task Assignments**: Audible job dispatch alerts with accept/reject timers.
  * **Turn-by-Turn GPS Navigation**: Route calculations via OSRM, direction steps, live distance/ETA, and neural voice guidance (English, Hindi, Hinglish).
  * **High-Frequency GPS Broadcasting**: Transmits rider coordinates, speed, heading, and accuracy to the backend every 3–5 seconds.
  * **300m Restaurant Departure Reminder**: Alerts riders to update status if they leave the store vicinity without marking the order as `picked_up`.
  * **Server-Enforced 200m Completion Geofence**: Enforces that orders can only be marked `delivered` when physically within 200 meters of the customer coordinates.

---

### 7. Restaurant POS Billing Terminal (`olive-pizza-pos` — Port 5178)
* **Target Users**: In-Restaurant Cashiers & Counter Staff.
* **Core Workings & Features**:
  * **Touch-Optimized Billing**: Fast order creation for Dine-In (with table assignment), Takeaway, and Direct Counter Delivery.
  * **Dual Persistence Storage**:
    * *Primary*: Server-side validation and synchronous commit to Firestore (`orders`, `pos_bills`) returning `BILL SUCCESS` in < 100ms.
    * *Secondary*: Asynchronous non-blocking sync to Google Sheets monthly franchise workbooks via `SheetsSyncWorker.ts`.
  * **Idempotency & Outage Resilience**: If Google Sheets is offline, bills remain marked as `SYNC_PENDING` and are retried automatically without interrupting POS sales.
  * **ESC/POS Thermal Receipt Engine**: Plaintext and binary ESC/POS formatting for 80mm/58mm receipt printers with GST compliance.
  * **Shift Management**: Cash drawer tracking, opening balance, cash/UPI/card sales tallies, and end-of-day shift closure audits.

---

## 3. Multi-Database Responsibility Matrix

| Data Entity | Primary Storage Engine | Secondary / Reporting Copy | Access Control & Scoping |
| :--- | :--- | :--- | :--- |
| **Active Orders & Carts** | **Firestore** (`orders`) | Google Sheets Monthly Workbook | Branch / Customer UID / Owner |
| **POS Bills & Shift Records** | **Firestore** (`pos_bills`, `pos_shifts`) | Google Sheets Monthly Workbook | Terminal ID / Branch ID / Owner |
| **Product & Menu Catalog** | **Firestore** (`products`, `categories`, `combos`) | Cloudflare R2 Backups | Public Read / Owner Write |
| **Live Rider GPS Telemetry** | **Supabase PostgreSQL** (`delivery_locations`) | WebSocket Server (`/ws`) | Authorized Order Channel Only |
| **High-Frequency Breadcrumbs**| **Supabase PostgreSQL** (`navigation_points`) | *None (5-min auto-purge)* | Temporary Navigation Active Run |
| **Payment Transactions & Ledgers**| **PostgreSQL** (`payments`, `payment_sessions`) | Payment Gateway Audit Logs | Backend Service Role Only |
| **Email & Notification Queues** | **PostgreSQL** (`email_queue`, `notification_queue`)| Operational Logs | Background Workers Only |
| **Monthly Financial Accounting**| **Google Sheets** (13 Structured Tabs) | Looker Studio Live Feed | Franchise Owner / Platform Owner |

---

## 4. Key Architectural Policies & Rules

1. **5-Minute Telemetry Retention Rule**:
   Raw GPS breadcrumb points in `navigation_points` and expired sessions in `navigation_sessions` older than 5 minutes are purged automatically by `DataRetentionJob.ts`. The current live state in `delivery_locations` is preserved for ongoing navigation.
2. **Zero GPS in Google Sheets**:
   Google Sheets workbooks receive purely financial, order, and accounting data; GPS telemetry is completely bypassed.
3. **Server-Side Multi-Tenancy**:
   No client is trusted to specify its own `branchId` or `franchiseId`. The backend resolves effective scope via JWT claims through `FranchiseScopeService`.
4. **Zero Client Secrets**:
   Private keys, Firebase Admin credentials, Cloudflare R2 secrets, PostgreSQL credentials, Fast2SMS keys, and payment secrets reside strictly in `olive-pizza-owner/backend`.

---

## 5. Build & Verification Commands

All projects compile cleanly with **0 errors**:

```powershell
# 1. Central Backend (Port 5000)
cd C:\Users\RYZEN\Downloads\olive-pizza-owner\backend
npm run build

# 2. Owner Console (Port 5174)
cd C:\Users\RYZEN\Downloads\olive-pizza-owner\frontend
npm run build

# 3. Customer Application (Port 3000)
cd C:\Users\RYZEN\Downloads\olive-pizza
npm run build

# 4. Franchise Management Suite (Port 5175)
cd C:\Users\RYZEN\Downloads\olive-pizza-franchise
npm run build

# 5. Restaurant Operations Console (Port 5176)
cd C:\Users\RYZEN\Downloads\Olive Pizza restaurant manager
npm run build

# 6. Delivery Partner App (Port 5177)
cd C:\Users\RYZEN\Downloads\olive-pizza-delivery
npm run build

# 7. POS Billing Terminal (Port 5178)
cd C:\Users\RYZEN\Downloads\olive-pizza-pos
npm run build
```
