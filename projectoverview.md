# Olive Pizza - Universal Project Overview (BRAIN.md)

## 1. System Overview & Architecture

Olive Pizza is a modern, full-stack web application designed for a pizza delivery business. It caters to three distinct user roles: Customers, Owners (Admins), and Delivery Partners. The application features real-time order tracking, AI-powered assistance, secure payments (or cart management), and comprehensive business intelligence dashboards.

### 1.1 Architecture Pattern
The project follows a Monorepo structure, separating the `frontend` (React + Vite) and `backend` (Node.js + Express). 

- **Frontend:** Client-side rendered Single Page Application (SPA) built with React 19, TypeScript, and Tailwind CSS. State management is handled globally via Zustand.
- **Native Android Wrappers:** Capacitor is used to compile the frontend web build into a native Android APK/AAB (`android/app`), utilizing native plugins for Google Sign-In and Push Notifications.
- **Backend:** RESTful API built with Node.js and Express, written in TypeScript. 
- **Primary Database (Firestore):** Acts as the single source of truth for the entire project's core data, including authentication records, menu items, orders, and reports.
- **Secondary Database (Supabase PostgreSQL):** Used exclusively for ephemeral or background tasks such as live delivery tracking, notification queues, and email reporting.
- **Vector Database (Qdrant):** Used strictly for the AI knowledge base.
- **Media Storage (Cloudinary):** Used for uploading and serving images and videos (e.g., menu items).
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
- **Real-time & DB Client:** @supabase/supabase-js
- **Auth Client:** Firebase SDK
- **3D/Graphics:** Three.js, ogl, canvas

### Backend
- **Core:** Node.js, Express 4, TypeScript
- **Security:** Helmet, CORS, Express Rate Limit
- **Database Clients:** Firebase Admin SDK (Primary), pg (node-postgres for Supabase)
- **AI Integration:** OpenAI, @google/genai, Qdrant
- **Utilities:** Node Cron, Node Cache, Nodemailer, libphonenumber-js, Google Drive API

---

## 3. Data Flow & State Flow

### 3.1 State Flow (Frontend)
State is managed efficiently using **Zustand** stores (`frontend/src/lib/store.ts`, `aiStore.ts`). 
- `useAuthStore`: Tracks current user, role (`customer`, `owner`, `delivery`), and authentication status. Hydrated upon Firebase Auth state changes.
- `useCartStore`: Manages the shopping cart. Adds items, updates quantities, calculates totals, and clears upon successful checkout.
- `useOwnerSettingsStore`: Manages POS (Point of Sale) alert configurations like sound alerts for new orders, browser notifications, and volume levels.
- `useAIStore`: Manages chat history and UI state for the AI Assistant feature.

### 3.2 Data Flow (Order Lifecycle)
1. **Selection:** Customer adds menu items to Cart (`useCartStore`).
2. **Checkout:** Customer submits order payload to backend `/orders` route.
3. **Database Insertion:** Backend validates and inserts the order into **Firestore** (`orders` collection) as the primary source of truth.
4. **Real-time Alert:** Firestore snapshot listeners (or push notifications) notify the Owner dashboard of a new `pending` order.
5. **Acceptance:** Owner accepts the order, status changes to `preparing`.
6. **Assignment:** Order is assigned to a `delivery_partner`, status changes to `out_for_delivery`. A record is created in `active_deliveries`.
7. **Tracking:** Delivery partner's app sends periodic GPS coordinates to update `active_deliveries` (`current_lat`, `current_lng`).
8. **Customer Tracking:** Customer views `OrderTracking.tsx`, which subscribes to Supabase Realtime on `active_deliveries` to map the driver's location via Leaflet.
9. **Completion:** Driver marks order as `delivered`.

### 3.3 Automatic Version Management Flow
To ensure clients always have the latest PWA version without manual refreshing:
1. Backend exposes `GET /api/health/version` which returns the current `git_commit` and `build_hash`.
2. Frontend `AutoUpdater.tsx` polls this endpoint every 10 minutes in the background.
3. If a mismatch is detected, the frontend aggressively unregisters all Service Workers, clears the PWA Cache, and triggers a silent `window.location.reload()`.
4. Capacitor Native App checks GitHub releases (`/tags/android-latest`) on startup and prompts the user to download an updated APK if `Version Code` increases.

---

## 4. Workflows & Business Logic

### 4.1 Customer Workflow
- **Onboarding:** Registers via Firebase Auth. Requires email verification, phone setup, and location setup (guarded by `OnboardingGuard.tsx`).
- **Browsing:** Views menu (fetched from Firestore).
- **Purchasing:** Adds to cart, proceeds to checkout, tracks live delivery.
- **AI Assistant:** Can interact with the AI assistant for recommendations.

### 4.2 Owner Workflow
- **Dashboard:** Uses `OwnerLayout.tsx` for a specialized POS interface.
- **Order Management:** Real-time visibility into all incoming orders. Can update order statuses.
- **Business Intelligence:** Views sales, revenue, and order volume charts (`BusinessIntelligence.tsx`).
- **Menu Management:** Can add/edit menu items, uploading images via Cloudinary.
- **Staff Tracking:** `OwnerLiveMap.tsx` plots all active delivery partners on a unified map.

### 4.3 Delivery Partner Workflow
- **Dashboard:** Uses `DeliveryLayout.tsx`.
- **Active Deliveries:** Receives assigned orders.
- **Location Broadcasting:** Background/foreground location updates are sent to the backend/Supabase to update `active_deliveries`.

---

## 5. Security & Configuration

### 5.1 Authentication & Authorization
- **Firebase Auth:** Handles the heavy lifting of password management, OAuth, and session tokens.
- **Backend Verification:** Protected routes use an auth middleware that verifies the Firebase ID token (`admin.auth().verifyIdToken()`).
- **Role-Based Access Control (RBAC):** Users table contains a `role` column (`customer`, `owner`, `delivery`). The backend enforces role checks for sensitive endpoints (e.g., only owners can access `/admin` or `/reports`).

### 5.2 API Security
- **Helmet:** Sets secure HTTP headers.
- **CORS:** Restricts cross-origin requests to trusted domains.
- **Rate Limiting:** Protects endpoints against brute-force and DDoS. Distinct limits for global (`100 req/15min`), auth (`5 req/min`), and AI endpoints (`20 req/min`).

### 5.3 Environment Configuration & Strict Startup Validation
Requires `.env` with:
- Firebase Admin/Client credentials (e.g., `FIREBASE_SERVICE_ACCOUNT_BASE64`).
- Supabase URL and keys (for live tracking/queues).
- Cloudinary URL/Keys.
- PostgreSQL `DATABASE_URL`.
- Nodemailer SMTP credentials.
- Google Drive & Qdrant API credentials.

To prevent silent failures in production, the backend features a strict boot validator (`validator.ts`) that runs synchronously. If any required environment variable is missing or malformed (like invalid base64), it prints a critical error table and halts execution with `process.exit(1)`.

### 5.4 Idempotency & Distributed Checkout Locks
To prevent a user from submitting the same order multiple times due to a bad network, multi-device clicking, or UI bugs, the backend uses a distributed PostgreSQL lock:
- When a user submits an order, `order.routes.ts` executes `INSERT INTO checkout_locks ... ON CONFLICT (user_id) DO UPDATE`.
- This ensures only ONE checkout transaction can happen per user within a 3-minute window.
- The lock is cleared in a `finally` block once the order creation succeeds or gracefully fails.

---

## 6. Integrations

- **Firestore (Primary DB):** The source of truth for structured project data (`users`, `orders`, `menu_items`, `reports`).
- **Supabase PostgreSQL (Secondary DB):** Leveraged strictly for real-time live tracking (`active_deliveries`), notification queues, and backend email reporting processing.
- **Qdrant (Vector DB):** Used exclusively for storing AI context and vector embeddings.
- **Firebase Authentication:** Identity Provider (IdP) for web and native platforms.
- **Cloudinary:** Media storage solution for images and videos.
- **Google Drive:** Used for securely storing generated monthly business reports.
- **OpenAI/Gemini:** Powers `ai.service.ts` for the intelligent chatbot.
- **Leaflet & OpenStreetMap:** Free-tier mapping solution for live tracking, eliminating expensive Google Maps API costs.

---

## 7. Database Schema & Architecture Highlights

### Firestore (Primary)
- `users`: Core identity table tied to Firebase UID. Stores roles, onboarding flags, and saved locations.
- `menu_items`: Product catalog.
- `orders`: Transactional records linking users and delivery partners, including nested order items.
- `reports`: Saved historical reporting data.

### Supabase PostgreSQL (Secondary / Ephemeral)
- `active_deliveries`: Ephemeral tracking data containing live lat/lng coordinates, continuously updated by delivery partners.
- `checkout_locks`: Ephemeral table that locks user accounts during the payment/order creation phase to prevent duplicate orders across devices.
- `device_heartbeats`: Tracks online/offline status, battery level, and app versions for active driver & owner devices.
- `notification_queue` & `notification_history`: Manages background task processing for sending push notifications and transactional emails asynchronously.

---

## 8. Deployment & Operational Behavior

- **Frontend Deployment:** Configured for Vercel (indicated by `vercel.json` and Vite build tools). Builds a static SPA bundle.
- **Backend Deployment:** Node.js Express server. Can be deployed on Render, Railway, or Heroku. The build script uses `esbuild` to bundle the backend into a single `dist/server.js` file for optimized execution.
- **Real-time Operations:** The application heavily relies on Supabase's Realtime feature. If WebSocket connections drop, order status updates and driver tracking will revert to polling or become stale. Ensure Supabase realtime quotas are monitored.

---

### 9. Risks, Assumptions, & Technical Debt

- **Data Synchronization:** If any workflows require data to exist in both Firestore and Supabase simultaneously (e.g. user ids inside tracking tables), they must be kept in sync. 
- **Location Battery Drain:** The delivery app constantly tracking and broadcasting GPS coordinates is battery-intensive. Optimization around update intervals (e.g., only update every 10 seconds or when distance changes > 10m) is critical.
- **Web vs Native Discrepancies:** Capacitor wraps the PWA in a WebView. Features like Google Sign-In and Push Notifications require explicit native plugin bridging. Testing must be verified on an actual physical Android device, as browser testing will bypass native API failures.
- **Rate Limit Bottlenecks:** Memory-based rate limiting (`express-rate-limit`) in Node.js works for single-instance deployments but will fail to sync limits if the backend is scaled horizontally across multiple instances. A Redis store would be required for distributed rate limiting.
- **Technical Debt:** Managing two separate databases (Firestore and Supabase) requires careful orchestration to ensure the backend always knows which database to query for which task.

---

## 10. Maintenance Considerations

- **Schema Migrations:** Any changes to `schema.sql` must be carefully applied via Supabase CLI or Dashboard. Ensure backward compatibility.
- **Dependency Updates:** React 19 and Tailwind v4 are bleeding edge. Watch out for breaking changes in minor library updates within `package.json`.
- **Logs & Monitoring:** `logger.ts` is implemented. In production, this should pipe to a service like Datadog, Sentry, or CloudWatch for actionable alerts, especially for failed payment webhooks or AI service timeouts.
