# 🍕 Olive Pizza Customer — Mobile-First Food Ordering Platform

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.0-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![MapLibre](https://img.shields.io/badge/MapLibre-3D%20Maps-396BFF?logo=maplibre&logoColor=white)](https://maplibre.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

> **Olive Pizza Customer App** is an enterprise-grade, mobile-first food ordering experience built for **Olive Pizza**, Rajnandgaon, Chhattisgarh, India. Available as a responsive Mobile Web app, native Android APK (Capacitor), and native iOS app (Capacitor).

Part of the **Olive Pizza Multi-App Ecosystem**. For full platform architecture, see [`docs/architecture/projectoverview.md`](./docs/architecture/projectoverview.md).

---

## 🌟 Core UX & Feature Highlights

### 📱 1. Mobile-First Design & Native App Feel
* **Mobile-First Priority**: Designed with a strict mobile-first policy:
  1. Mobile Website
  2. Android / iOS Native App (Capacitor)
  3. Desktop Website
* **Premium Aesthetics**: Smooth micro-interactions, glassmorphic floating cards, tactile touch targets, and branded Olive Pizza color palettes.

### 🍕 2. Interactive 3D Visual Menu & Cart Experience
* **Customization Engine**: Category capsules, pizza size selectors (8", 10", 12"), crust options (*Hand-Tossed*, *Thin & Crispy*, *Cheese Burst*), and dynamic paid add-ons.
* **Sequenced 5-Step Add-to-Cart Motion**:
  1. 3D pizza delivery box drops into the viewport.
  2. The selected food item smoothly flies into the box.
  3. The box lid snaps securely shut.
  4. The sealed box flies dynamically to the floating cart.
  5. The floating cart bounces with spring physics and haptic particle burst.
* **Alive Floating Cart**:
  - Ambient soft breathing motion while idle.
  - Spring-loaded drawer opening animation with live badge count updates.

### 🛵 3. Live 3D Order Tracking (`OrderTracking.tsx`)
* **60fps Smooth Telemetry**: MapLibre GL JS 3D vector map with dynamic camera auto-following.
* **Real-Time Rider Radar**: Interpolated rider coordinates streamed in real-time from the backend WebSocket server (`/ws`) and Supabase PostgreSQL.
* **Lifecycle Timeline**: Live status updates across all order stages (`pending` ➔ `accepted` ➔ `preparing` ➔ `ready` ➔ `out_for_delivery` ➔ `delivered`).

### 💳 4. Multi-Gateway Checkout & Instant Phone Verification
* **Payment Gateways**: Cashfree, PhonePe, Razorpay, UPI QR, and Cash on Delivery with strict backend validation.
* **Fast OTP & 1-Tap Auth**: Fast2SMS OTP integration, Truecaller 1-tap phone verification, and Firebase Authentication.
* **Location Pinning**: Interactive map pin dragging with OpenStreetMap Nominatim reverse-geocoding.

### 🛡️ 5. Startup Deadlock Prevention
* **Decoupled Auth Resolution**: Eliminates cold-start freezing on the splash screen by resolving auth tokens asynchronously with a strict 1500ms safety watchdog ceiling.

---

## 🏗️ System Architecture & Connectivity

The Customer App is one of six client applications connecting to the **Canonical Central Backend**:

```
 [Customer App (Port 3000)] ───► [Canonical Central Backend (Port 5000)]
                                           │
          ┌────────────────────────────────┼────────────────────────────────┐
          ▼                                ▼                                ▼
     [Firestore]                  [Supabase Postgres]             [Operational Postgres]
(Orders, Menu, Auth)             (Live GPS Telemetry)             (Payments, System State)
```

For full ecosystem documentation, please inspect:
- 📖 [Comprehensive Project Overview](./docs/architecture/projectoverview.md)

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
# Clone or navigate to the directory
cd olive-pizza

# Install dependencies
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000/ws
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=olive-pizza-08
VITE_FIREBASE_STORAGE_BUCKET=olive-pizza-08.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Running Locally
```bash
# Start Vite development server on port 3000
npm run dev
```

### 5. Building for Production
```bash
# Run TypeScript compilation and Vite production build
npm run build
```

---

## 📱 Mobile App Compilation (Capacitor)

### Android
```bash
# Build web assets and sync to native Android container
npm run build
npx cap sync android

# Open in Android Studio to build debug/release APK
npx cap open android
```

### iOS
```bash
# Build web assets and sync to native iOS container
npm run build
npx cap sync ios

# Open in Xcode to build archive/IPA
npx cap open ios
```

---

## 📄 License & Proprietary Notice

Proprietary Software — All rights reserved by **Olive Pizza**, Rajnandgaon, Chhattisgarh, India.
