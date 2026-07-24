# Olive Pizza - Universal Project Overview (BRAIN.md)

## 1. System Overview & Architecture

Olive Pizza is a modern, full-stack web and native mobile application designed for a pizza delivery business. It caters to three distinct user roles: Customers, Owners (Admins), and Delivery Partners. The application features real-time order tracking, AI-powered assistance, secure payments/cart management, live driver GPS tracking, and comprehensive business intelligence dashboards.

### 1.1 Architecture Pattern
The project follows a Monorepo structure, separating the `frontend` (React + Vite) and `backend` (Node.js + Express). 

- **Frontend:** Client-side rendered Single Page Application (SPA) built with React 19, TypeScript, and Tailwind CSS. State management is handled globally via Zustand.
- **Native Android Wrappers:** Capacitor wraps the frontend SPA into a native Android APK/AAB (`android/app`), featuring custom native Android extensions (`OliveMessagingService.java`, `AlarmActivity.java`, `NotificationActionReceiver.java`) for continuous order alarms, channel setup, and pinned notifications.
- **Backend:** RESTful API built with Node.js and Express, written in TypeScript. 
- **Primary Database (Firestore):** Single source of truth for all persistent core data, including authentication records, menu items, orders, user roles, and historical reports.
- **Secondary Database (Supabase PostgreSQL):** Used for real-time delivery tracking (`active_deliveries`), device heartbeats, checkout idempotency locks (`checkout_locks`), and notification logging (`fcm_tokens`, `notification_queue`, `email_queue`).
- **Vector Database (Qdrant):** Used strictly for the AI knowledge base and semantic search.
- **Media Storage (Cloudinary):** Used for uploading and serving menu item images and media assets.
- **Document Storage (Google Drive):** Used for generating and storing monthly business reports.

---

## 2. Dependencies & Tech Stack

### Frontend
- **Core:** React 19, React DOM, TypeScript
- **Routing:** React Router v7
- **Styling:** Tailwind CSS v4, Lucide React (icons), Framer Motion (animations)
- **State Management:** Zustand
- **Maps & Tracking:** Leaflet, React Leaflet
- **Charts & Reporting:** Chart.js, React Chartjs 2, jsPDF, papaparse
- **Real-time & DB Client:** `@supabase/supabase-js`
- **Auth Client:** Firebase SDK
- **3D/Graphics:** Three.js, OGL, HTML Canvas

### Backend
- **Core:** Node.js, Express 4, TypeScript
- **Security:** Helmet, CORS, Express Rate Limit
- **Database Clients:** Firebase Admin SDK (Primary), `pg` (node-postgres for Supabase PostgreSQL)
- **AI Integration:** OpenAI, `@google/genai`, Qdrant Client
- **Utilities:** Node Cron, Node Cache, Nodemailer, `libphonenumber-js`, Google Drive API

### Native Android
- **Framework:** Capacitor 6 with Push Notifications plugin
- **Firebase Messaging:** Custom `OliveMessagingService` extending FCM `MessagingService` for native continuous alarm sounds (`order_alert`), full-screen intent triggers, and `ongoing` pinned tracker notifications.

---

## 3. Data Flow & State Flow

### 3.1 State Flow (Frontend)
State is managed using **Zustand** stores (`frontend/src/lib/store.ts`, `aiStore.ts`):
- `useAuthStore`: Tracks current user profile, role (`customer`, `owner`, `delivery`), and authentication status. Hydrated automatically upon Firebase Auth state changes.
- `useCartStore`: Manages the shopping cart—adds/removes items, calculates subtotal, discounts, and delivery fees, and auto-clears upon checkout.
- `useOwnerSettingsStore`: Manages POS (Point of Sale) alert configurations like continuous sound alerts, volume, and browser notification permissions.
- `useAIStore`: Manages chat history and UI state for the AI Assistant feature.

### 3.2 Data Flow (Order Lifecycle)
1. **Selection:** Customer adds menu items to Cart (`useCartStore`).
2. **Checkout:** Customer submits order payload to backend `/orders` route.
3. **Database Insertion:** Backend validates payload and inserts the order into **Firestore** (`orders` collection) as the primary source of truth.
4. **Real-time Alert & Push:** Firestore snapshot listener (`firestore.listener.ts`) detects the new order (`added`) and fires:
   - An instant **Direct Push Notification** (`directNotification.sendPush`) to the customer with `status: 'pending'` and `ongoing: true` (creating an Android pinned status bar notification).
   - A loud, continuous **FCM Alarm** (`alert: 'continuous'`, `olive_order_new` channel) to all Owner devices.
   - An instant transactional email via `email.service.ts` to both customer and owner.
5. **Acceptance:** Owner accepts order (`accepted`). Listener dispatches an instant `stop_alert` signal to kill the ringing alarm across all owner devices, and pushes an updated live card (`status: 'accepted'`) to the customer.
6. **Assignment:** Order is assigned to a `delivery_partner` (`partner_assigned`). Listener dispatches a new assignment push to the driver and updates customer progress.
7. **Tracking:** Delivery partner's app broadcasts periodic GPS coordinates to update Supabase `active_deliveries` (`current_lat`, `current_lng`).
8. **Customer Tracking:** Customer views `OrderTracking.tsx`, subscribing to Supabase Realtime on `active_deliveries` to display live driver movement on a Leaflet map.
9. **Completion:** Driver marks order as `delivered`. Customer's pinned notification receives `stage: 'delivered'` which unpins (`setOngoing(false)`) and cancels the ongoing tracker notification on Android.

### 3.3 Push Notification & Email Delivery Flow
To eliminate delivery latency and background worker stalls:
- **Push Pipeline:** Uses `DirectNotificationService.ts` for zero-latency direct FCM multicast messaging to active device tokens, with `NotificationQueueService.ts` acting as a database inbox backup.
- **Email Pipeline:** Transactional emails (`queueEmail` in `email.service.ts`) execute an immediate, direct `transporter.sendMail()` call first for 100% real-time email delivery, logging to PostgreSQL afterwards for audit tracking.

### 3.4 Automatic Version Management Flow
1. Backend exposes `GET /api/health/version` returning current `git_commit` and `build_hash`.
2. Frontend `AutoUpdater.tsx` polls this endpoint every 10 minutes.
3. On mismatch, frontend unregisters Service Workers, clears PWA Cache, and silently reloads `window.location.reload()`.
4. Native Android App checks GitHub releases (`/tags/android-latest`) on startup and prompts for APK updates if `Version Code` increases.

---

## 4. Workflows & Business Logic

### 4.1 Customer Workflow
- **Onboarding:** Registers via Firebase Auth (supports email/password, Google Sign-In, and optional phone setup guarded by `OnboardingGuard.tsx`).
- **Browsing & Ordering:** Interactive menu browsing, customization, cart calculations, and checkout.
- **Live Order Tracking:** Real-time progress bar + pinned ongoing status bar notification + live driver map tracking (`OrderTracking.tsx`).
- **AI Assistant:** Conversational ordering recommendations and support via Qdrant vector context.

### 4.2 Owner Workflow
- **POS & Dashboard:** Specialized POS layout (`OwnerLayout.tsx`) with instant visual and continuous audio alerts for new orders.
- **Order Control:** Accept, prepare, mark ready, assign delivery partners, or cancel orders with automatic cross-device alarm dismissal (`stop_alert`).
- **Business Intelligence:** Analytics on revenue, sales velocity, popular items, and historical trends (`BusinessIntelligence.tsx`).
- **Staff & Delivery Monitoring:** `OwnerLiveMap.tsx` plots all active delivery drivers on a unified real-time map.

### 4.3 Delivery Partner Workflow
- **Dashboard:** Specialized driver view (`DeliveryLayout.tsx`).
- **Assignment Handling:** Instant FCM notification for new order assignments with customer contact and navigation details.
- **GPS Broadcasting:** Automatic foreground/background location updates sent to Supabase `active_deliveries`.

---

## 5. Security & Configuration

### 5.1 Authentication & Authorization
- **Firebase Auth:** Manages authentication tokens, password hashing, and OAuth sessions.
- **Backend Auth Middleware:** Validates Firebase ID tokens (`admin.auth().verifyIdToken()`).
- **Role-Based Access Control (RBAC):** Enforces user roles (`customer`, `owner`, `delivery`) across sensitive API endpoints (`/admin`, `/reports`, `/owner`).

### 5.2 API Security
- **Helmet:** Enforces secure HTTP headers.
- **CORS:** Restricts cross-origin requests to trusted web and mobile domains.
- **Rate Limiting:** Protects endpoints against DDoS and brute force via `express-rate-limit` (global: 100 req/15min, auth: 5 req/min, AI: 20 req/min).

### 5.3 Startup Boot Validation
- `validator.ts` runs synchronously during backend startup. If mandatory environment variables (Firebase Service Account, Supabase keys, PostgreSQL `DATABASE_URL`, SMTP creds) are missing or invalid, it logs a formatted error table and halts process execution (`process.exit(1)`).

### 5.4 Idempotency & Distributed Checkout Locks
- Backend uses PostgreSQL `checkout_locks` table (`ON CONFLICT (user_id) DO UPDATE`) to prevent duplicate order submissions within a 3-minute window during network lag or accidental double clicks.

---

## 6. Integrations

- **Firestore (Primary DB):** Core document database (`users`, `orders`, `menu_items`, `reports`).
- **Supabase PostgreSQL (Secondary DB):** Real-time tracking (`active_deliveries`), checkout locks (`checkout_locks`), device heartbeats, and FCM token management (`fcm_tokens`).
- **Qdrant Vector DB:** Vector store for AI assistant context retrieval.
- **Firebase Authentication:** Identity Provider (IdP) for Web and Android.
- **Cloudinary:** Media asset storage for menu images.
- **Google Drive:** Automated cloud storage for generated business reports.
- **OpenAI & Google Gemini:** Conversational AI engines for backend assistant endpoints (`ai.service.ts`).
- **Leaflet & OpenStreetMap:** Open-source map rendering engine for live driver tracking.

---

## 7. Database Schema & Architecture Highlights

### Firestore (Primary)
- `users`: Core user accounts (role, onboarding status, saved addresses, fcmTokens).
- `menu_items`: Product catalog (prices, categories, image URLs, stock availability).
- `orders`: Master order records (items, pricing breakdown, status timeline, delivery partner info).
- `reports`: Generated business intelligence records.

### Supabase PostgreSQL (Secondary / Ephemeral)
- `active_deliveries`: Real-time driver location coordinates (`current_lat`, `current_lng`, `last_updated`).
- `checkout_locks`: Active checkout lock timestamps by `user_id`.
- `device_heartbeats`: Online/offline status, battery level, app version, and active role per device.
- `fcm_tokens`: Active Firebase Cloud Messaging tokens per user device with platform metadata.
- `notification_queue` & `email_queue`: Inbox tracking and historical log storage for notifications and emails.

---

## 8. Deployment & Operational Behavior

- **Frontend Deployment:** Static SPA bundle deployed on Vercel (`vercel.json`).
- **Backend Deployment:** Node.js Express server bundled via `esbuild` into `dist/server.js`, deployable on Render/Railway.
- **Android App:** Built via Capacitor 6 into native APK/AAB (`android/app`) supporting custom FCM services.
- **Real-time Dependencies:** Relies on Supabase Realtime for WebSocket-based driver GPS tracking. If WebSockets disconnect, tracking safely gracefully degrades or polls.

---

## 9. Risks, Assumptions, & Technical Debt

- **Dual-Database Synchronization:** Care must be taken so references between Firestore UIDs and Supabase records remain consistent.
- **GPS Battery Consumption:** Continuous background GPS broadcasting on delivery devices requires optimized sampling intervals (distance/time thresholds).
- **Web vs Native Differences:** Browser push notifications lack Android native capabilities (such as full-screen alarm intents or `setOngoing(true)` notification pinning). Android native testing via actual APK/emulator is mandatory for FCM alarm validation.

---

## 10. Maintenance Considerations

- **Schema Updates:** PostgreSQL DDL updates (`schema.sql`) should be applied carefully via Supabase migrations.
- **Dependencies:** React 19 and Tailwind v4 require monitoring for library compatibility during version bumps.
- **Logging & Monitoring:** Backend uses `logger.ts` and `NotificationLogger.ts` to log real-time FCM responses and error diagnostics.
