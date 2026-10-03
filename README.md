# 🍕 Olive Pizza Customer — Mobile-First Food Ordering Platform

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.0-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Live_GPS_Tracking-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![MapLibre](https://img.shields.io/badge/MapLibre-3D%20Maps-396BFF?logo=maplibre&logoColor=white)](https://maplibre.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

> **Olive Pizza Customer App** is an enterprise-grade, mobile-first food ordering experience built for **Olive Pizza**, Rajnandgaon, Chhattisgarh, India. Available as a responsive Mobile Web application, native Android APK (Capacitor), and native iOS app (Capacitor).

Part of the **Olive Pizza Multi-App Ecosystem**. Connects to the authoritative **Canonical Central Backend** (Port 5000).

---

## 🌟 Core UX & Feature Highlights

### 📱 1. Mobile-First Policy & Native App Feel
* **Mobile-First Priority**: Designed following strict mobile-first architecture:
  1. Mobile Website
  2. Android / iOS Native App (Capacitor)
  3. Desktop Website
* **Premium Aesthetics**: Smooth micro-interactions, glassmorphic floating cards, tactile touch targets, and branded Olive Pizza color tokens.

### 🍕 2. Interactive 3D Visual Menu & Cart Experience
* **Server-Authoritative Pricing**: All pizza prices, sizes (8", 10", 12"), crust options (*Hand-Tossed*, *Thin & Crispy*, *Cheese Burst*), add-ons, discounts, and taxes are strictly calculated and enforced on the server. Zero client price trust.
* **Sequenced 5-Step Add-to-Cart Motion**:
  1. 3D pizza delivery box drops into the viewport.
  2. The selected food item smoothly flies into the box.
  3. The box lid snaps securely shut.
  4. The sealed box flies dynamically to the floating cart.
  5. The floating cart bounces with spring physics and haptic particle burst.
* **Alive Floating Cart**:
  - Ambient soft breathing motion while idle.
  - Spring-loaded drawer opening animation with live badge count updates.

### 🛵 3. Live 3D Order Tracking & Telemetry
* **60fps Smooth Telemetry**: MapLibre GL JS 3D vector map with dynamic camera auto-following.
* **Real-Time Rider Radar**: Interpolated rider coordinates streamed in real-time from the backend WebSocket server (`/ws`) and **Supabase PostgreSQL** (`public.delivery_locations`).
* **Lifecycle Timeline**: Live status updates across all order stages (`pending` ➔ `accepted` ➔ `preparing` ➔ `ready` ➔ `out_for_delivery` ➔ `delivered`).

### 💳 4. Multi-Gateway Checkout & Instant Phone Verification
* **Payment Gateways**: Cashfree, PhonePe, Razorpay, UPI QR, and Cash on Delivery with strict backend validation and server-computed GST totals.
* **Fast OTP & 1-Tap Auth**: Fast2SMS OTP integration, Truecaller 1-tap phone verification, and Firebase Authentication.
* **Location Pinning**: Interactive map pin dragging with OpenStreetMap reverse-geocoding and server-validated branch delivery radius.

### 🎨 5. Server-Driven UI (SDUI) Runtime
* Dynamically renders custom layouts, promo banners, festive themes, and featured sections published by the owner from the SDUI Studio without requiring new App Store or Play Store deployments.

### 🔒 6. Idempotency & Order Deduplication
* Multi-click checkout protection using cryptographic client idempotency keys, preventing duplicate charges and double order creation.

### 📜 7. Indian DPDP Act 2023 Data Privacy Compliance
* Full compliance with data privacy regulations: Right to Access (sanitized data export), Right to Correction, formal Grievance Redressal (`GRV-...`), and Account Erasure with a 30-day statutory cooling period.
* Raw customer phone numbers are completely masked and scrubbed from FCM push notification payloads.

---

## 🏗️ System Architecture & Connectivity

```text
 [Customer App (Port 3000)] ───► [Canonical Central Backend (Port 5000)]
                                           │
          ┌────────────────────────────────┼────────────────────────────────┐
          ▼                                ▼                                ▼
     [Firestore]                  [Supabase Postgres]              [Main PostgreSQL]
(Realtime Projections, Menu)      (Live GPS Telemetry)         (Canonical Orders, Payments)
```

---

## 🛠️ Technology Stack

- **Framework**: React 19, TypeScript
- **Bundler & Tooling**: Vite 6, Tailwind CSS v4
- **Mobile Runtime**: Capacitor 8 (iOS & Android)
- **State Management**: Zustand
- **Animations**: Framer Motion 12
- **3D Maps**: MapLibre GL JS, React Leaflet, OSRM

---

## ⚡ Getting Started

### 1. Prerequisites
- Node.js `v20+` or `v22+`
- Central Backend running on `http://localhost:5000` (or configured production backend)

### 2. Installation
```bash
cd olive-pizza
npm install
```

### 3. Running Locally
```bash
# Start Vite development server
npm run dev
```

### 4. Native App Builds (Capacitor)
```bash
# Build web assets and sync to native platforms
npm run build
npx cap sync android
npx cap sync ios
```

---

## 📜 License

Proprietary © Olive Pizza. All rights reserved.
