# 🍕 Olive Pizza — Enterprise Multi-Platform Order & Delivery System

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.0-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%26%20FCM-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime%20GPS-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

> Olive Pizza is a full-stack, enterprise-grade multi-platform food ordering, POS management, and delivery navigation platform built for **Rajnandgaon, Chhattisgarh, India**. Features real-time Firestore synchronization, native Android background alarm notifications (which trigger even when the Android app is killed/closed), Supabase GPS live tracking with 3D MapLibre navigation, and automated Google Drive report backups.

---

## 🌟 Key Features

### 🛒 Customer App & Mobile Web (PWA)
- **3D Interactive Menu & Cart**: Smooth micro-animations powered by Framer Motion, HSL color tokens, and a 5-step sequenced add-to-cart animation (3D box drop → item flight → lid closure → cart bounce).
- **Live Order Tracking**: Dynamic `/order-tracking/:orderId` page featuring real-time Firestore status updates (`pending` → `accepted` → `preparing` → `ready` → `out_for_delivery` → `delivered`) and live rider GPS location on a 3D map.
- **Location-Aware Checkout**: Auto-detects customer onboarding location, supports interactive map pin dragging, reverse-geocodes street addresses via OpenStreetMap Nominatim, and passes exact coordinates to delivery partners.

### 🏢 Owner Control Center & POS Panel (`/owner`)
- **Multi-Device Live Orders Board**: Real-time `onSnapshot` order dashboard that synchronizes instantly across multiple logged-in owner devices without page refreshes.
- **Native High-Priority Alarm System**: Triggers full wake-lock continuous alarm audio and full-screen activity popups on new orders—proven to wake devices even when completely closed/killed.
- **Fleet Control View**: Interactive `OwnerLiveMapModal` with real-time 3D rider location updates via Supabase Realtime.
- **Automated Reporting & Backup**: Weekly business metric reports compiled to PDF (`jspdf-autotable`), backed up to Google Drive API v3, and emailed to the owner via SMTP (`nodemailer`).

### 🛵 Delivery Partner Navigation (`/delivery`)
- **Dual-Mode Camera Map**: Tilted 45° 3D navigation view with direction-of-travel heading map rotation during active auto-follow; automatically drops to a 0° top-down view when touched or dragged.
- **Turn-by-Turn Guidance & Offline Voice**: Turn maneuvers rendered in an instruction HUD accompanied by on-device Text-to-Speech (TTS) voice announcements.
- **Offline Polyline Pre-Caching**: OSRM routes and turn steps pre-cache to `localStorage` upon order acceptance. Position updates queue locally while offline and flush to Supabase once network reconnects.
- **Proof of Delivery**: Supports instant photo proof capture (environment camera) and Cloudinary upload upon order completion.

---

## 🏗️ Architecture Overview

```mermaid
flowchart TD
    subgraph Clients["Multi-Platform Clients"]
        Customer["Customer PWA / Mobile"]
        Owner["Owner POS Panel"]
        Rider["Delivery Rider App (Android Native)"]
    end

    subgraph Backend["Node.js / Express Server"]
        API["Express REST API"]
        FSListener["Firestore Listener Service"]
        ReportJob["Weekly Report Service (Cron)"]
    end

    subgraph Databases["Cloud Infrastructure"]
        Firestore[("Firebase Firestore (Business State)")]
        Postgres[("PostgreSQL (FCM Tokens & Logs)")]
        Supabase[("Supabase Realtime (Rider GPS)")]
        FCM["Firebase Cloud Messaging (Direct Push)"]
        GDrive["Google Drive API v3 (PDF Vault)"]
    end

    Customer -->|Place Order| Firestore
    Firestore -->|onSnapshot Trigger| FSListener
    FSListener -->|Direct Push / Alarm| FCM
    FCM -->|Native Wake Lock / Push| Owner
    FCM -->|Status Push| Customer
    
    Rider -->|GPS Position (Every 3s)| Supabase
    Supabase -->|Realtime Channel| Customer
    Supabase -->|Realtime Channel| Owner

    ReportJob -->|Upload PDF| GDrive
```

---

## 🛠️ Technology Stack

### **Frontend & UI**
- **Core**: React 19, TypeScript, Vite 6, Tailwind CSS v4
- **State Management**: Zustand
- **Animations**: Framer Motion 12
- **3D Maps & GIS**: MapLibre GL JS 6, React Leaflet, OSRM Routing Machine

### **Native Android Layer**
- **Framework**: Capacitor 8
- **Native Java Code**:
  - `OliveMessagingService.java`: FCM Receiver with `FULL_WAKE_LOCK`, `ACQUIRE_CAUSES_WAKEUP`, and canonical `IMPORTANCE_MAX` channels.
  - `AlarmActivity.java`: Physical screen wake flags (`FLAG_SHOW_WHEN_LOCKED`, `FLAG_TURN_SCREEN_ON`) and `USAGE_ALARM` audio stream routing.
  - `DeliveryPlugin.java`: Native high-accuracy background geolocation watcher.

### **Backend Infrastructure**
- **Runtime**: Node.js, Express, TypeScript (`tsx` execution)
- **Databases**: Firebase Firestore & Auth, PostgreSQL (`pg`), Supabase Realtime
- **Push Engine**: Firebase Admin SDK 13 (FCM Multicast Direct)
- **Document Services**: Google Drive API v3 (`googleapis`), Nodemailer, jsPDF

---

## 📂 Project Structure

```text
olive-pizza/
├── android/                        # Android Native Project (Capacitor)
│   └── app/src/main/java/com/olivepizza/app/
│       ├── OliveMessagingService.java  # Native FCM & WakeLock Handler
│       ├── AlarmActivity.java          # Full-screen Lockscreen Alarm Activity
│       └── DeliveryPlugin.java         # Native Background GPS Plugin
├── backend/                        # Node.js Express Backend
│   ├── credentials/                # Service Account JSON Keys
│   ├── src/
│   │   ├── config/                 # Postgres & Firebase Configuration
│   │   ├── listeners/              # Firestore Realtime Event Listeners
│   │   ├── routes/                 # Express API Endpoint Routes
│   │   └── services/               # Google Drive, FCM, & PDF Services
│   └── server.ts                   # Backend Entry Point
├── frontend/                       # React 19 Frontend Web Application
│   └── src/
│       ├── components/             # Reusable UI & Map Components
│       │   ├── map/
│       │   │   └── UniversalMap3D.tsx # MapLibre GL JS 3D Engine
│       │   └── owner/              # Owner POS & Live Orders Table
│       ├── lib/                    # Config, Firebase, & Supabase SDKs
│       ├── pages/                  # Customer, Owner, & Delivery Pages
│       └── services/               # Navigation, Routing, & TTS Services
├── .agents/                        # Standing Regression Checklist & Specs
├── vite.config.ts                  # Vite Build Configuration & Chunk Splitting
└── package.json                    # Root Workspace Dependencies
```

---

## ⚡ Getting Started

### 1. Prerequisites
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Android Studio**: (For native APK builds)
- **Databases**: Firebase Account, PostgreSQL Instance, Supabase Project

### 2. Environment Setup

Create `.env` files in both project root and `backend/`:

#### Root `.env` (Frontend):
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### `backend/.env` (Backend):
```env
PORT=5000
DATABASE_URL=postgres://user:password@localhost:5432/olive_pizza
FIREBASE_SERVICE_ACCOUNT_BASE64=your_base64_service_account
GOOGLE_DRIVE_SERVICE_ACCOUNT_PATH=credentials/google-drive-service-account.json
GOOGLE_DRIVE_FOLDER_ID=your_google_drive_folder_id
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 3. Installation & Local Development

```bash
# Clone the repository
git clone https://github.com/your-org/olive-pizza.git
cd olive-pizza

# Install root & frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Start Full-Stack Development Server (Frontend + Backend concurrently)
npm run dev
```

The application will run at `http://localhost:5173`.

---

## 📱 Android Build & Deployment

```bash
# Build production bundle
npm run build

# Sync web assets to Capacitor Android project
npx cap sync android

# Open project in Android Studio
npx cap open android
```

From Android Studio, choose **Build → Build Bundle(s) / APK(s) → Build APK(s)** to generate production APK binaries.

---

## 🛡️ Infrastructure Reliability & Quality Assurance

Olive Pizza includes a standing regression checklist in [.agents/standing_regression_checklist.md](file:///.agents/standing_regression_checklist.md).

### Verification Steps before release:
1. **Google Drive Sync Health**: Run `npx tsx -e "import('./src/services/googleDrive.service.ts').then(m => m.googleDriveService.getHealthStatus().then(console.log))"`.
2. **Two-Client Realtime Sync**: Run automated concurrent snapshot event tests to verify zero-latency multi-device updates.
3. **Lighthouse Performance Gate**: Verify main landing page score ≥ 95/100 and LCP ≤ 1.4s.

---

## 📄 License

Proprietary Software — All rights reserved by **Olive Pizza**, Rajnandgaon, Chhattisgarh, India.
