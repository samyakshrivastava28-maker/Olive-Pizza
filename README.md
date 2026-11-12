# 🍕 Olive Pizza Customer App (v2.2.0)

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.0-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Live_GPS_Tracking-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![MapLibre](https://img.shields.io/badge/MapLibre-3D%20Maps-396BFF?logo=maplibre&logoColor=white)](https://maplibre.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

> **Olive Pizza Customer App** is an enterprise-grade, mobile-first food ordering experience built for **Olive Pizza**, Rajnandgaon, Chhattisgarh, India. Available as a responsive Mobile Web application and native Android APK (Capacitor).

---

## 🌟 Core UX & Feature Highlights

### 📱 1. Mobile-First Policy & Native App Feel
- **Mobile-First Priority**: Designed with native touch targets, fluid spring physics, and high-performance GPU-accelerated motion.
- **Glassmorphic Spatial UI**: Tailored with branded Olive Pizza amber and dark stone palettes.

### 🍕 2. Interactive Visual Menu & Cart Experience
- **Server-Authoritative Pricing**: All pizza sizes (8", 10", 12"), crust options (*Hand-Tossed*, *Thin & Crispy*, *Cheese Burst*), add-ons, discounts, and taxes (5% GST: 2.5% CGST + 2.5% SGST) are strictly validated on the authoritative backend. Zero client price trust.
- **Sequenced 5-Step Add-to-Cart Motion**:
  1. 3D pizza delivery box drops into the viewport.
  2. The selected food item smoothly flies into the box.
  3. The box lid snaps securely shut.
  4. The sealed box flies dynamically to the floating cart.
  5. The floating cart bounces with spring physics and haptic particle burst.
- **Alive Floating Cart**:
  - Ambient breathing animation while idle.
  - Spring-loaded drawer opening animation with live badge count updates.

### 🛵 3. Live 3D Order Tracking & Telemetry
- **MapLibre GL JS 3D Vector Map**: Real-time rider coordinates streamed via backend WebSocket server (`/ws`) and Supabase PostgreSQL (`public.delivery_locations`).
- **Lifecycle Timeline**: Live status updates across all order stages (`PLACED` ➔ `PREPARING` ➔ `READY` ➔ `OUT_FOR_DELIVERY` ➔ `DELIVERED`).

### 💳 4. Multi-Gateway Checkout & Instant Phone Verification
- **Payment Options**: Cash on Delivery (COD), UPI Intent / QR, Razorpay, Cashfree, and PhonePe with cryptographic client idempotency keys.
- **Phone Verification**: Fast2SMS OTP integration, Truecaller 1-tap phone verification, and Firebase Authentication.

---

## 📦 Latest Release Downloads (v2.2.0)

All production release binaries are pre-compiled and staged in `C:\Users\RYZEN\Downloads\OlivePizza_Release_Binaries`:
- **Android APK**: `OlivePizza_Customer_v2.2.0_Release.apk` (25.68 MB)
- **Integrity**: Check SHA256 in `SHA256SUMS.txt`

---

## 🚀 Local Development

```bash
# Install dependencies
npm install

# Run development server on port 3000
npm run dev
# Open http://localhost:3000

# Build production bundle
npm run build
```

---

## 🌐 Render Deployment

Deployable to [Render](https://render.com) as a Static Site via `render.yaml`.
Required environment variables:
- `VITE_API_BASE_URL`: URL of the deployed backend (e.g., `https://olive-pizza-backend.onrender.com`)
- `VITE_BACKEND_URL`: URL of the deployed backend
- `VITE_APP_VERSION`: `2.2.0`
