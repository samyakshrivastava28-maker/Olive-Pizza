# Olive Pizza - Universal Project Overview (BRAIN.md)

## 1. System Overview & Architecture

Olive Pizza is a modern, full-stack web and native mobile application designed for a pizza delivery business. It caters to three distinct user roles: Customers, Owners (Admins), and Delivery Partners. The application features real-time order tracking, 3D vector map navigation, AI-powered voice guidance and assistance, secure payments/cart management, live driver GPS tracking, and comprehensive business intelligence dashboards.

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
- **Speech & Neural TTS (NVIDIA NIM):** Powered by **NVIDIA Chatterbox Multilingual TTS** (`resemble-ai/chatterbox-multilingual`) via backend proxy (`/api/tts/synthesize`) for high-fidelity voice guidance with multi-tier fallbacks (Web Speech API, Android Native TTS).
- **Map & 3D Vector Engine:** Powered by **MapLibre GL JS** and **OpenFreeMap** vector tiles for 3D building rendering, sub-pixel marker lerping (60fps), and turn-by-turn navigation routing (OSRM).

---

## 2. Dependencies & Tech Stack

### Frontend
- **Core:** React 19, React DOM, TypeScript
- **Routing:** React Router v7
- **Styling:** Tailwind CSS v4, Lucide React (icons), Framer Motion (animations)
- **State Management:** Zustand
- **Maps & 3D Vector Navigation:** MapLibre GL JS, OpenFreeMap, Leaflet (legacy fallback)
- **Speech Synthesis:** NVIDIA Chatterbox TTS proxy, Web Speech API (`window.speechSynthesis`), Capacitor Native TTS
- **Charts & Reporting:** Chart.js, React Chartjs 2, jsPDF, papaparse
- **Real-time & DB Client:** `@supabase/supabase-js`
- **Auth Client:** Firebase SDK
- **3D/Graphics:** MapLibre GL, Three.js, OGL, HTML Canvas

### Backend
- **Core:** Node.js, Express 4, TypeScript
- **Security:** Helmet, CORS, Express Rate Limit, HMAC-SHA256 signed tracking tokens
- **Database Clients:** Firebase Admin SDK (Primary), `pg` (node-postgres for Supabase PostgreSQL)
- **AI & Speech Integration:** NVIDIA NIM API (Chatterbox Multilingual TTS), OpenAI, `@google/genai`, Qdrant Client
- **Utilities:** Node Cron, Node Cache, Nodemailer, `libphonenumber-js`, Google Drive API

### Native Android
- **Framework:** Capacitor 6 with Push Notifications & App plugins
- **Firebase Messaging:** Custom `OliveMessagingService` extending FCM `MessagingService` for native continuous alarm sounds (`order_alert`), full-screen intent triggers, and `ongoing` pinned tracker notifications.

---

## 3. Data Flow & State Flow

### 3.1 State Flow (Frontend)
State is managed using **Zustand** stores (`frontend/src/lib/store.ts`, `aiStore.ts`, `trackingStore.ts`):
- `useAuthStore`: Tracks current user profile, role (`customer`, `owner`, `delivery`), and authentication status. Hydrated automatically upon Firebase Auth state changes.
- `useCartStore`: Manages the shopping cart—adds/removes items, calculates subtotal, discounts, and delivery fees, and auto-clears upon checkout.
- `useOwnerSettingsStore`: Manages POS (Point of Sale) alert configurations like continuous sound alerts, volume, and browser notification permissions.
- `useTrackingStore`: Tracks real-time GPS location telemetry, heading, speed, and navigation route data.
- `useAIStore`: Manages chat history and UI state for the AI Assistant feature.

### 3.2 Data Flow (Order Lifecycle)
1. **Selection:** Customer adds menu items to Cart (`useCartStore`).
2. **Checkout:** Customer submits order payload to backend `/orders` route.
3. **Database Insertion:** Backend validates payload and inserts the order into **Firestore** (`orders` collection) as the primary source of truth.
4. **Real-time Alert & Push:** Firestore snapshot listener (`firestore.listener.ts`) detects the new order (`added`) and fires:
   - An instant **Direct Push Notification** (`directNotification.sendPush`) to the customer with `status: 'pending'`, `ongoing: true`, and an HMAC-SHA256 signed tracking token (`?trackingToken=...`) for background deep-link security.
   - A loud, continuous **FCM Alarm** (`alert: 'continuous'`, `olive_order_new` channel) to all Owner devices.
   - An instant transactional email via `email.service.ts` to both customer and owner.
5. **Acceptance:** Owner accepts order (`accepted`). Listener dispatches an instant `stop_alert` signal to kill the ringing alarm across all owner devices, and pushes an updated live card (`status: 'accepted'`) to the customer.
6. **Assignment:** Order is assigned to a `delivery_partner` (`partner_assigned`). Listener dispatches a new assignment push to the driver and updates customer progress.
7. **Tracking:** Delivery partner's app broadcasts periodic GPS coordinates to update Supabase `active_deliveries` (`current_lat`, `current_lng`).
8. **Customer & Owner Tracking:** Customer views `OrderTracking.tsx` and Owner views `OwnerLiveMapModal.tsx`, subscribing to Supabase Realtime on `active_deliveries` to render 3D driver movement via `UniversalMap3D`.
9. **Navigation & Voice Guidance:** Delivery Partner uses built-in 3D navigation in `DeliveryDashboard.tsx`. Turn-by-turn directions are synthesized in real-time via NVIDIA Chatterbox Multilingual TTS in English, Hindi, or Hinglish.
10. **Completion:** Driver marks order as `delivered`. Customer's pinned notification receives `stage: 'delivered'` which unpins (`setOngoing(false)`) and cancels the ongoing tracker notification on Android.

### 3.3 Speech Synthesis (TTS) Architecture
- **Primary Engine:** NVIDIA Chatterbox Multilingual TTS (`resemble-ai/chatterbox-multilingual`). Calls backend `/api/tts/synthesize` proxy using `NVIDIA_API_KEY`, returning MP3 audio streams.
- **Fallback Architecture:** If NVIDIA API is unreachable or offline, the client seamlessly falls back to Web Speech API (`window.speechSynthesis`) or native Android TTS via Capacitor.

### 3.4 Automatic Version Management & Update Flow
1. Backend exposes `GET /api/version/settings` and `GET /api/github/latest-release`.
2. App monitors version status; when an update is available, the "Update" button dispatches `performUpdate()`.
3. Clicking **Update** takes the user directly to the APK download endpoint (`/api/github/download-apk`) and GitHub Releases site (`https://github.com/samyakshrivastava28-maker/Olive-Pizza/releases/latest`), while unregistering old Service Workers and clearing cache for PWA clients.

---

## 4. Workflows & Business Logic

### 4.1 Customer Workflow
- **Onboarding:** Registers via Firebase Auth (supports email/password, Google Sign-In, and optional phone setup guarded by `OnboardingGuard.tsx`).
- **Browsing & Ordering:** Interactive menu browsing, customization, cart calculations, and checkout.
- **Live 3D Order Tracking:** Real-time progress bar + pinned ongoing status bar notification + MapLibre 3D driver map tracking (`OrderTracking.tsx`).
- **AI Assistant:** Conversational ordering recommendations and support via Qdrant vector context.

### 4.2 Owner Workflow
- **POS & Dashboard:** Specialized POS layout (`OwnerLayout.tsx`) with instant visual and continuous audio alerts for new orders.
- **Order Control & Live Fleet View:** Accept, prepare, mark ready, assign delivery partners, or track live riders in 3D (`OwnerLiveMapModal.tsx`).
- **Developer Operations Center:** Full DevOps dashboard (`DeveloperDashboard.tsx`) restricted strictly to `webhub2811@gmail.com` with auto-provisioned `developer: true` custom claim.

### 4.3 Delivery Partner Workflow
- **Dashboard:** Driver layout (`DeliveryLayout.tsx`).
- **Assignment Handling & 3D Navigation:** Instant FCM notification for assignments, with built-in 3D MapLibre navigation and multilingual voice guidance (NVIDIA Chatterbox TTS).
- **GPS Broadcasting:** Foreground/background location updates sent to Supabase `active_deliveries`.

---

## 5. Security & Configuration

### 5.1 Authentication & Authorization
- **Firebase Auth:** Manages authentication tokens, password hashing, and OAuth sessions.
- **Backend Auth Middleware:** Validates Firebase ID tokens (`admin.auth().verifyIdToken()`). Supports `optionalAuth` for public deep links.
- **Developer Access Lock:** Developer Dashboard and `/api/devops` endpoints are restricted strictly to `webhub2811@gmail.com`.
- **HMAC-SHA256 Signed Tracking Tokens:** Push notification deep links embed signed, 4-hour expiring tokens (`?trackingToken=...`) allowing safe tracking from closed-app push notifications.

---

## 6. Integrations

- **Firestore (Primary DB):** Core document database (`users`, `orders`, `menu_items`, `reports`).
- **Supabase PostgreSQL (Secondary DB):** Real-time tracking (`active_deliveries`), checkout locks (`checkout_locks`), device heartbeats, and FCM token management (`fcm_tokens`).
- **NVIDIA NIM (Speech AI):** Chatterbox Multilingual TTS for neural voice synthesis.
- **MapLibre GL JS & OpenFreeMap:** Vector tile map rendering with 3D buildings.
- **Qdrant Vector DB:** Vector store for AI assistant context retrieval.
- **Firebase Authentication:** Identity Provider (IdP) for Web and Android.
- **Cloudinary:** Media asset storage for menu images.
- **Google Drive:** Automated cloud storage for generated business reports.
