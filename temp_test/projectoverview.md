# Olive Pizza - Universal Project Overview (BRAIN.md)

## 1. System Overview & Architecture

Olive Pizza is a modern, full-stack web application designed for a pizza delivery business. It caters to three distinct user roles: Customers, Owners (Admins), and Delivery Partners. The application features real-time order tracking, AI-powered assistance, secure payments (or cart management), and comprehensive business intelligence dashboards.

### 1.1 Architecture Pattern
The project follows a Monorepo structure, separating the `frontend` (React + Vite) and `backend` (Node.js + Express). 

- **Frontend:** Client-side rendered Single Page Application (SPA) built with React 19, TypeScript, and Tailwind CSS. State management is handled globally via Zustand.
- **Backend:** RESTful API built with Node.js and Express, written in TypeScript. 
- **Database:** PostgreSQL hosted on Supabase, acting as the primary data store and enabling real-time functionalities via WebSockets.
- **Authentication:** Firebase Authentication manages user identity and issues JWTs, which the backend verifies.
- **Media Storage:** Cloudinary is used for uploading and serving images (e.g., menu items).

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
- **Database Client:** pg (node-postgres)
- **AI Integration:** OpenAI, @google/genai
- **Utilities:** Node Cron, Node Cache, Nodemailer, libphonenumber-js

---

## 3. Data Flow & State Flow

### 3.1 State Flow (Frontend)
State is managed efficiently using **Zustand** stores (`frontend/src/lib/store.ts`, `aiStore.ts`). 
- `useAuthStore`: Tracks current user, role (`customer`, `owner`, `delivery`), and authentication status. Hydrated upon Firebase Auth state changes.
- `useCartStore`: Manages the shopping cart. Adds items, updates quantities, calculates totals, and clears upon successful checkout.
- `useOwnerSettingsStore`: Manages POS (Point of Sale) alert configurations like sound alerts for new orders, browser notifications, and volume levels.
- `useAIStore`: Manages chat history and UI state for the AI Assistant feature.

### 3.2 Data Flow (Order Lifecycle)
1. **Selection:** Customer adds `menu_items` to Cart (`useCartStore`).
2. **Checkout:** Customer submits order payload to backend `/orders` route.
3. **Database Insertion:** Backend validates and inserts the order into `orders` and `order_items` tables in Supabase Postgres.
4. **Real-time Alert:** Supabase Realtime (or push notifications) notifies the Owner dashboard of a new `pending` order.
5. **Acceptance:** Owner accepts the order, status changes to `preparing`.
6. **Assignment:** Order is assigned to a `delivery_partner`, status changes to `out_for_delivery`. A record is created in `active_deliveries`.
7. **Tracking:** Delivery partner's app sends periodic GPS coordinates to update `active_deliveries` (`current_lat`, `current_lng`).
8. **Customer Tracking:** Customer views `OrderTracking.tsx`, which subscribes to Supabase Realtime on `active_deliveries` to map the driver's location via Leaflet.
9. **Completion:** Driver marks order as `delivered`.

---

## 4. Workflows & Business Logic

### 4.1 Customer Workflow
- **Onboarding:** Registers via Firebase Auth. Requires email verification, phone setup, and location setup (guarded by `OnboardingGuard.tsx`).
- **Browsing:** Views menu (fetched from Supabase `menu_items`).
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

### 5.3 Environment Configuration
Requires `.env` with:
- Firebase Admin/Client credentials.
- Supabase URL and keys (Anon for frontend, Service Role for backend).
- Cloudinary URL.
- OpenAI / Google GenAI API Keys.
- Nodemailer SMTP credentials.

---

## 6. Integrations

- **Supabase (PostgreSQL):** The source of truth for structured data (`users`, `orders`, `menu_items`). Also leveraged for its real-time capabilities via websockets to push database changes directly to the frontend.
- **Firebase:** Identity Provider (IdP) and potentially used for push notifications (`pushNotifications.ts`).
- **Cloudinary:** Media storage solution. Images are uploaded here, and the resulting CDN URLs are saved in the Postgres database.
- **OpenAI/Gemini:** Powers `ai.service.ts` for the intelligent chatbot that assists customers with menu inquiries and order status.
- **Leaflet & OpenStreetMap:** Free-tier mapping solution for live tracking, eliminating expensive Google Maps API costs.

---

## 7. Database Schema Highlights

- `users`: Core identity table tied to `firebase_uid`. Stores roles, onboarding flags, and saved locations.
- `menu_items`: Product catalog.
- `orders`: Transactional records linking `user_id` and `delivery_partner_id`.
- `order_items`: Line items for each order (Many-to-One with `orders`).
- `active_deliveries`: Ephemeral tracking data containing live lat/lng coordinates, continuously updated by delivery partners.

---

## 8. Deployment & Operational Behavior

- **Frontend Deployment:** Configured for Vercel (indicated by `vercel.json` and Vite build tools). Builds a static SPA bundle.
- **Backend Deployment:** Node.js Express server. Can be deployed on Render, Railway, or Heroku. The build script uses `esbuild` to bundle the backend into a single `dist/server.js` file for optimized execution.
- **Real-time Operations:** The application heavily relies on Supabase's Realtime feature. If WebSocket connections drop, order status updates and driver tracking will revert to polling or become stale. Ensure Supabase realtime quotas are monitored.

---

## 9. Risks, Assumptions, & Technical Debt

- **Data Synchronization:** Firebase Auth and Supabase Postgres `users` table must be kept in sync. If a user is created in Firebase but fails to insert into Postgres, they will exist in a broken state.
- **Location Battery Drain:** The delivery app constantly tracking and broadcasting GPS coordinates is battery-intensive. Optimization around update intervals (e.g., only update every 10 seconds or when distance changes > 10m) is critical.
- **Rate Limit Bottlenecks:** Memory-based rate limiting (`express-rate-limit`) in Node.js works for single-instance deployments but will fail to sync limits if the backend is scaled horizontally across multiple instances. A Redis store would be required for distributed rate limiting.
- **Technical Debt:** Managing two separate "Backend as a Service" platforms (Firebase and Supabase) adds complexity. Future refactoring might consider moving Auth entirely to Supabase Auth to consolidate infrastructure.

---

## 10. Maintenance Considerations

- **Schema Migrations:** Any changes to `schema.sql` must be carefully applied via Supabase CLI or Dashboard. Ensure backward compatibility.
- **Dependency Updates:** React 19 and Tailwind v4 are bleeding edge. Watch out for breaking changes in minor library updates within `package.json`.
- **Logs & Monitoring:** `logger.ts` is implemented. In production, this should pipe to a service like Datadog, Sentry, or CloudWatch for actionable alerts, especially for failed payment webhooks or AI service timeouts.
