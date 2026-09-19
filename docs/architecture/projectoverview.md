# 🍕 Olive Pizza Ecosystem — Comprehensive Project Overview & Architecture Guide

> **Current Production Backend**: `https://olive-pizza-backend.onrender.com` | **Dev Backend**: `http://localhost:5000`  
> **Architecture Model**: Six Independent Client Applications ➔ One Shared Canonical Backend  
> **Headquarters**: Rajnandgaon, Chhattisgarh, India  

---

## 1. Executive Summary & Ecosystem Topology

Olive Pizza is an enterprise-grade multi-platform food ordering, restaurant management, kitchen display (KDS), point-of-sale (POS), franchise administration, and real-time delivery logistics ecosystem.

The system is built on a **Single Authoritative Canonical Backend** model serving **six distinct, independently deployable client applications**. Every client application connects to the same backend for business rules, identity, security, order state machines, and real-time messaging, while maintaining strictly scoped roles and permissions.

```
                                      OLIVE PIZZA CANONICAL BACKEND
                                      (Port 5000 / Express + TS)
                                                  │
                 ┌────────────────────────────────┼────────────────────────────────┐
                 ▼                                ▼                                ▼
            [FIRESTORE]                  [SUPABASE POSTGRES]              [OPERATIONAL POSTGRES]
     App State, Orders, Catalog,        Live GPS Navigation,             Payments, Auth Sessions,
     SDUI Layouts, POS Bills & Shifts     Breadcrumb Telemetry                 System Queues
                 │                                │                                │
                 │                                ▼                                │
                 │                         WebSocket (/ws)                         │
                 │                    Monotonic 200-Event Ring Buffer              │
                 │                                │                                │
                 └────────────────────────────────┼────────────────────────────────┘
                                                  │
       ┌──────────────┬──────────────┬────────────┴──┬──────────────┬──────────────┬──────────────┐
       │              │              │               │              │              │              │
       ▼              ▼              ▼               ▼              ▼              ▼              ▼
    Customer        Owner        Franchise       Restaurant      Delivery        POS         AI Assistant
     (Web/App)     (Console)      (Suite)       (KDS Console)    (Rider App)  (Terminal)     (Intelligence)
      :3000          :5174          :5175           :5176          :5177         :5178         (Independent)
```

### Application & Service Port Registry

| Application / Service | Repository Directory | Port | Primary Users & Operational Responsibility |
| :--- | :--- | :---: | :--- |
| **Canonical Central Backend** | `olive-pizza-owner/backend` | **5000** | Authoritative business logic, order state machines, identity/RBAC scoping, WebSockets, FCM push dispatcher, Ring Buffer, Google Sheets sync, Cloudflare R2 |
| **Customer Application** | `olive-pizza` | **3000** | Online customers (Mobile Web, iOS & Android via Capacitor) — 3D Visual Menu, Cart, 60fps MapLibre GPS Tracking, Multi-Gateway Checkout |
| **Owner Platform Console** | `olive-pizza-owner/frontend` | **5174** | Global Platform Owners (`olivepizzarjn@gmail.com`, `webhub2811@gmail.com`) — 7-Step Franchise Provisioning, SDUI Visual Designer, Menu AI, Central Analytics |
| **Franchise Management Suite** | `olive-pizza-franchise` | **5175** | Regional Franchise Owners — Multi-branch revenue monitoring, staff account management, POS hardware authorization, Global Owner context switching |
| **Restaurant Operations & KDS**| `Olive Pizza restaurant manager` | **5176** | Store Branch Managers & Kitchen Staff — Full-Information Critical Order Alerts, Live KDS Queue, Inventory, Fleet Radar & Dispatch |
| **Delivery Partner App** | `olive-pizza-delivery` | **5177** | Delivery Riders — High-urgency assignment modals, turn-by-turn OSRM GPS navigation, neural voice prompts, 3-5s GPS broadcasting, geofences |
| **POS Billing Terminal** | `olive-pizza-pos` | **5178** | Store Cashiers & Counter Operators — High-speed touch billing (Dine-In, Takeaway, Delivery), ESC/POS thermal printing, dual persistence, shift logs |
| **Olive Pizza AI** *(Separate)* | Dedicated AI Service | — | Customer, Owner, & Developer AI Assistant, RAG knowledge retrieval, prompt enhancement *(strictly decoupled from main backend)* |

---

## 2. Detailed Technical Workings of All Six Applications & Backend

### 1. Customer Application (`olive-pizza` — Port 3000)
* **Target Users**: Consumers ordering food online via mobile browsers, iOS native app, or Android native app.
* **Architecture & Stack**: React 19, TypeScript, Vite 6, Tailwind CSS v4, Capacitor 8 (iOS/Android), Zustand, Framer Motion 12.
* **Core Systems & Features**:
  * **Mobile-First Design Policy**: Built from the ground up for handheld devices first, ensuring native-app feel with glassmorphic cards and touch targets.
  * **Interactive Visual Menu**: Responsive category capsules, pizza size selectors (8", 10", 12"), crust customizations (Hand-Tossed, Thin & Crispy, Cheese Burst), and paid add-ons.
  * **Sequenced 5-Step Add-to-Cart Animation**: 3D delivery box drops into view ➔ selected food image flies into box ➔ box lid snaps shut ➔ closed box flies to floating cart ➔ floating cart bounces with haptic particle effect.
  * **Alive Floating Cart**: Ambient soft breathing float animation, dynamic badge counts, and spring-loaded drawer expansion.
  * **Live 3D Order Tracking (`OrderTracking.tsx`)**: High-performance 60fps rider marker interpolation on MapLibre GL 3D vector maps powered by WebSocket telemetry and Supabase realtime coordinates.
  * **Multi-Gateway Payment Flow**: Integration with Cashfree, PhonePe, Razorpay, UPI QR, and Cash on Delivery with server-side price recalculation and validation.
  * **Ultra-Fast 5-Second Intro Experience**: Dedicated CDN-trimmed 5s H.264 video (~880KB) with instant 5KB poster frame and 2.5s buffering failsafe.
  * **Startup Deadlock Resilience**: Decoupled Firebase Auth state resolution with a 1500ms hard safety ceiling preventing infinite splash loader stalls.

---

### 2. Canonical Central Backend (`olive-pizza-owner/backend` — Port 5000)
* **Target Users**: System service providing authoritative data and APIs to all 6 client apps.
* **Architecture & Stack**: Node.js, Express, TypeScript (native `tsx`), PostgreSQL (`pg`), Firebase Admin SDK 13, WebSocket (`ws`), Supabase JS.
* **Core Systems & Services**:
  * **FranchiseScopeService**: Strict multi-tenant security layer. Extracts user identity from Firebase JWT claims and enforces branch, franchise, and role permissions on every API request. Regular branch staff cannot read or write data outside their branch.
  * **OrderStateMachine**: 16 certified lifecycle transitions with strict invariant verification, concurrency locks (`order_locks`), and audit logging.
  * **Critical Full-Information Order Alert Dispatcher**:
    * Serializes the full canonical order into `data.fullOrderJson` in FCM push payloads.
    * Formats itemized lists without truncation, full financial calculations, customer notes, delivery coordinates, and payment badges.
    * Broadcasts to high-priority FCM channels (`olive_order_alarm_v3`, `olive_delivery_alarm_v3`) with action buttons (`ACCEPT_ORDER`, `REJECT_ORDER`, `VIEW_ORDER`, `OPEN_LOCATION`).
  * **WebSocket Server with Monotonic Branch Ring Buffer**:
    * Real-time bidirectional streaming on `/ws`.
    * Maintains an in-memory 200-event rolling ring buffer per branch (`${franchiseId}:${branchId}`).
    * Monotonically incrementing sequence numbers guarantee gap detection.
    * Handshake sync (`sync_request` / `sync_response`) replays missed orders upon network reconnection.
  * **Dual-Persistence Synchronization**:
    * Sub-100ms commit to Firestore (`orders`, `pos_bills`).
    * Asynchronous non-blocking background queue pushing bills and shifts to Google Sheets 13-tab monthly workbooks with automatic offline retry.
  * **DataRetentionJob**: Automated minutely background worker enforcing the 5-minute raw GPS telemetry retention rule on PostgreSQL while preserving permanent order and financial history.

---

### 3. Owner Platform Console (`olive-pizza-owner/frontend` — Port 5174)
* **Target Users**: Global Platform Owners (`olivepizzarjn@gmail.com`, `webhub2811@gmail.com`).
* **Architecture & Stack**: React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide Icons, Zustand.
* **Core Systems & Features**:
  * **Central Franchise Provisioning Wizard (`/franchises`)**:
    * 7-Step atomic provisioning wizard: 1. Franchise Info ➔ 2. Franchise Owner Account ➔ 3. First Branch Parameters ➔ 4. Branch Manager Account ➔ 5. Interactive GPS Map Picker ➔ 6. POS Terminal Allocation ➔ 7. Review & Atomic Provisioning.
  * **Scoped Context Launchers**:
    * Global owners can launch into standalone Franchise Suite (Port 5175) or Restaurant KDS (Port 5176) with 1-click using server-authorized temporary context tokens (`POST /api/auth/context-session`).
  * **SDUI Visual Designer (`/home-manager`)**:
    * Server-Driven UI designer for customer app homepage.
    * Visual controls for sections, cards, banners, promo carousels, spacing, alignment, and responsiveness.
    * Google Stitch visual design generation integration with DeepSeek V4 Flash prompt enhancement.
    * Preview-before-publish safety, undo/redo, and versioned Firestore deployments.
  * **Product & Menu AI Management (`/products`)**:
    * Product catalog management with AI prompt enhancement and image generation (Qwen Image, FLUX.1-dev, Stable Diffusion 3.5 Large).
  * **Continuous Emergency Alarm**: Unmissable repeating audio alarm loop for orders awaiting restaurant acceptance.

---

### 4. Franchise Management Suite (`olive-pizza-franchise` — Port 5175)
* **Target Users**: Regional Franchise Licensees and Area Operations Directors.
* **Architecture & Stack**: React 19, TypeScript, Vite 6, Tailwind CSS v4, Electron + Capacitor, Zustand.
* **Core Systems & Features**:
  * **Multi-Branch Operations Dashboard**: Real-time aggregated and branch-level metrics across all outlets licensed to the franchise.
  * **Staff & Hardware Provisioning**:
    * Creation and credential management for restaurant branch managers, counter cashiers, and delivery riders.
    * POS terminal hardware authorizations with strict device token binding.
  * **Top-Bar Global Owner Switcher**:
    * Dynamic dropdown `Current Franchise: [Franchise Name ▼]` with a `[Back to Owner Console]` button when accessed by Global Owners; locked to assigned franchise for regional owners.
  * **Consolidated Financial Reports**: Revenue aggregation, tax calculations (CGST + SGST), payment method distributions, and sales trends.

---

### 5. Restaurant Operations Console & Kitchen KDS (`Olive Pizza restaurant manager` — Port 5176)
* **Target Users**: Store Branch Managers, Kitchen Chefs, and Expeditors.
* **Architecture & Stack**: React 19, TypeScript, Vite 6, Tailwind CSS v4, Electron (Windows/Mac) + Capacitor (Android/iOS), Zustand.
* **Core Systems & Features**:
  * **Critical Order Alert System**:
    * High-urgency alert modal triggering repeating sound alarm (`new_order.mp3`).
    * Full order details: complete line items, sizes, crusts, add-ons with pricing. Zero truncation.
    * Clear payment indicator: `⚠️ CASH TO COLLECT: ₹XXX` vs `✅ ONLINE PAYMENT: PAID IN FULL`.
    * Customer contact bar with 1-tap phone dialer (`tel:${phone}`) and 1-tap Google Maps directions.
    * Actionable buttons: `ACCEPT ORDER`, `SILENCE ALARM / ACKNOWLEDGE`, `REJECT ORDER`, `VIEW ORDER`.
  * **WebSocket Reconnection & Sequence Sync**:
    * Subscribes to backend `/ws` with branch authentication.
    * Replays missed orders automatically via `sync_request` if Wi-Fi drops.
  * **Live Orders Board (`LiveOrdersPage.tsx`)**:
    * Real-time KDS queue organized into `pending`, `preparing`, `ready`, and `out_for_delivery`.
    * 1-click status advances with backend validation.
  * **Kitchen Inventory & Fleet Dispatch**:
    * Tracking of raw ingredients (dough, mozzarella, sauces) and packaging boxes.
    * Real-time delivery fleet radar map and driver assignment.

---

### 6. Delivery Partner Application (`olive-pizza-delivery` — Port 5177)
* **Target Users**: Delivery Riders and Fleet Drivers.
* **Architecture & Stack**: React 19, TypeScript, Vite 6, Tailwind CSS v4, Capacitor (Android/iOS), Zustand.
* **Core Systems & Features**:
  * **High-Urgency Assignment Modal**:
    * Loud audible chime (`delivery_chime.mp3`) with continuous alert loop.
    * Full itemized order contents.
    * Bold payment collection instructions: `⚠️ CASH TO COLLECT: ₹XXX` or `✅ ONLINE PAID: DO NOT COLLECT CASH`.
    * 1-tap customer call button and 1-tap Google Maps route link.
  * **Turn-by-Turn GPS Navigation**:
    * Dual-mode MapLibre 3D vector map: 45° tilted heading auto-follow and 0° top-down overview.
    * Route calculations via OSRM with step-by-step navigation HUD.
    * Neural voice announcements (English, Hindi, Hinglish) for upcoming turns.
  * **High-Frequency GPS Telemetry**:
    * Broadcasts rider GPS coordinates, speed, heading, and accuracy to backend every 3–5 seconds.
  * **Geofence Enforcement**:
    * 300m restaurant departure reminder if rider leaves store area without marking order picked up.
    * Server-enforced 200m customer completion geofence preventing premature delivery completion.

---

### 7. Restaurant POS Billing Terminal (`olive-pizza-pos` — Port 5178)
* **Target Users**: Counter Cashiers and Store Operators.
* **Architecture & Stack**: React 19, TypeScript, Vite 6, Tailwind CSS v4, Electron + Capacitor, Zustand.
* **Core Systems & Features**:
  * **Touch-Optimized Fast Billing**:
    * Fast category navigation and item selection optimized for high-volume counter operations.
    * Multi-mode billing: Dine-In (with table assignment), Takeaway, and Direct Counter Delivery.
  * **Dual-Persistence Engine**:
    * Primary commit to Firestore (`orders`, `pos_bills`) completing in < 100ms.
    * Non-blocking background sync worker to Google Sheets monthly workbooks.
    * Offline queue: bills remain queued with `SYNC_PENDING` status if network drops, syncing automatically upon reconnection.
  * **ESC/POS Thermal Receipt Printing**:
    * Direct USB, network, and Bluetooth printing to 80mm and 58mm thermal receipt printers.
    * Formatted GST tax receipts with branch details, itemizations, and UPI QR payment code.
  * **Shift & Cash Drawer Management**:
    * Opening balance logging, mid-shift cash drop tracking, and end-of-day reconciliation audits.

---

## 3. Critical Full-Information Order Alert System

```
Customer Order Placed
         │
         ▼
Canonical Backend (Port 5000)
         │
         ├── 1. Writes to Firestore (orders) & logs audit entry in (order_audit_logs)
         │
         ├── 2. Generates Full-Information Payload (NotificationTemplates.ts)
         │       • Complete item list (names, sizes, crusts, add-ons, item prices)
         │       • Complete financial tally (subtotal, delivery, tax, discount, total)
         │       • Explicit Payment Badge (CASH TO COLLECT vs ONLINE PAID)
         │       • Customer phone, address, coordinates, instructions
         │       • Serializes full order object into data.fullOrderJson
         │
         ├── 3. FCM High Urgency Push Dispatch (NotificationRouter.ts)
         │       • Channel: olive_order_alarm_v3 (sound: new_order.mp3)
         │       • Action buttons: ACCEPT_ORDER, REJECT_ORDER, VIEW_ORDER, OPEN_LOCATION
         │
         └── 4. WebSocket Branch Broadcast (WebSocketServer.ts)
                 • Monotonic sequence increment (seq: N + 1)
                 • Recorded in 200-event branch ring buffer (${franchiseId}:${branchId})
                 • Dispatched to active branch terminals & supervisors
```

### Gap Detection & Reconnection Synchronization
When a kitchen or POS terminal loses Wi-Fi and reconnects:
1. Client sends: `{ type: "sync_request", franchiseId, branchId, lastSequence: 245 }`.
2. Backend queries ring buffer for events where `seq > 245`.
3. Backend responds: `{ type: "sync_response", currentSeq: 250, missedEvents: [ev246, ev247, ev248, ev249, ev250] }`.
4. Client iterates and renders all missed order alerts without duplicate alerts or dropped orders.

---

## 4. Multi-Database Responsibility Matrix

| Data Entity | Primary Storage Engine | Secondary / Reporting Copy | Access Control & Scoping |
| :--- | :--- | :--- | :--- |
| **Active Orders & Carts** | **Firestore** (`orders`) | Google Sheets Monthly Workbook | Branch / Customer UID / Owner |
| **Order Audit Trail** | **Firestore** (`order_audit_logs`)| Operational Logs | Append-only (Server Role Only) |
| **POS Bills & Shift Records** | **Firestore** (`pos_bills`, `pos_shifts`)| Google Sheets Monthly Workbook | Terminal ID / Branch ID / Owner |
| **Product & Menu Catalog** | **Firestore** (`products`, `categories`, `combos`)| Cloudflare R2 Backups | Public Read / Owner Write |
| **SDUI Layout Configurations**| **Firestore** (`sdui_configs`)| Version History Docs | Public Read / Owner Write |
| **Live Rider GPS Telemetry** | **Supabase PostgreSQL** (`delivery_locations`)| WebSocket Server (`/ws`) | Authorized Order Channel Only |
| **High-Frequency Breadcrumbs**| **Supabase PostgreSQL** (`navigation_points`)| *None (5-min auto-purge)* | Temporary Navigation Active Run |
| **Payment Transactions & Ledgers**| **PostgreSQL** (`payments`, `payment_sessions`)| Payment Gateway Webhooks | Backend Service Role Only |
| **Monthly Financial Accounting**| **Google Sheets** (13 Structured Tabs)| Looker Studio Live Feed | Franchise Owner / Platform Owner |

---

## 5. Security, Multi-Tenancy, & Access Control Rules

1. **Authorized Internal Accounts**:
   - `olivepizzarjn@gmail.com`
   - `webhub2811@gmail.com`
   Global Owner claims and cross-franchise context switching are strictly restricted to these authorized accounts.
2. **Server-Enforced Branch Isolation**:
   No client is ever trusted to supply its own `branchId` or `franchiseId`. The backend extracts and validates the scope from verified Firebase Auth JWT tokens.
3. **Zero Client Secrets**:
   All sensitive credentials (Firebase Admin private key, database passwords, payment gateway secrets, Fast2SMS API keys, Cloudflare R2 tokens) reside strictly on the canonical backend server.
4. **No Fake Integrations or Fake Calls**:
   All features use genuine APIs. The alert system strictly avoids prohibited VoIP CallKit/CallStyle abuse in full compliance with Google Play and Apple App Store guidelines.

---

## 6. Build, Verification, & Local Development Guide

All projects compile cleanly with **0 errors**:

```powershell
# 1. Central Backend (Port 5000)
cd C:\Users\RYZEN\Downloads\olive-pizza-owner\backend
npm run build
npm start

# 2. Owner Console (Port 5174)
cd C:\Users\RYZEN\Downloads\olive-pizza-owner\frontend
npm run build
npm run dev

# 3. Customer Application (Port 3000)
cd C:\Users\RYZEN\Downloads\olive-pizza
npm run build
npm run dev

# 4. Franchise Management Suite (Port 5175)
cd C:\Users\RYZEN\Downloads\olive-pizza-franchise
npm run build
npm run dev

# 5. Restaurant Operations Console (Port 5176)
cd C:\Users\RYZEN\Downloads\Olive Pizza restaurant manager
npm run build
npm run dev

# 6. Delivery Partner App (Port 5177)
cd C:\Users\RYZEN\Downloads\olive-pizza-delivery
npm run build
npm run dev

# 7. POS Billing Terminal (Port 5178)
cd C:\Users\RYZEN\Downloads\olive-pizza-pos
npm run build
npm run dev
```
