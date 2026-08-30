# Olive Pizza — Demo Deployment Discovery

**Generated:** 2026-08-30  
**Target:** Client Demonstration Preparation  
**Discovery Version:** 1.0.0  

---

## 1. Executive Summary

A comprehensive discovery of all six repositories across the Olive Pizza ecosystem was performed to prepare for the live client demonstration. This document records the architecture, package configurations, platforms, API routing, environment variables, Render account states, and Android build readiness.

---

## 2. Render Account Status

### Primary Account: `samyaks695@gmail.com`
- **Workspace:** `Samyak's workspace` (Hobby Plan)
- **Connected GitHub Organization:** `samyakshrivastava28-maker`
- **Free Instance Hours Usage:** **750.33 / 750 hours (100% EXHAUSTED)**
- **Existing Services:** None (0 active services in workspace)
- **Status:** **CAPACITY EXHAUSTED** — Per User Rule Section 1 & 3, deployment MUST transition to secondary account `olivepizzarjn@gmail.com`.

### Secondary Account: `olivepizzarjn@gmail.com`
- **Role:** Fallback / Primary active account for live demo services.
- **Expected Services:**
  - `olive-pizza` (Customer Web Service / Static Site)
  - `olive-pizza-owner` (Owner Dashboard / Canonical Backend)
- **Status:** Pending inspection on fresh browser session.

---

## 3. Project Ecosystem Matrix

| Project | Local Path | Git Remote (`origin`) | Branch | Platforms | Capacitor App ID | Frontend Build Script |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Customer** | `olive-pizza` | `https://github.com/samyakshrivastava28-maker/Olive-Pizza` | `main` | Web, Android | `com.olivepizza.app` | `vite build` |
| **Owner** | `olive-pizza-owner` | `https://github.com/samyakshrivastava28-maker/Olivepizza-owner.git` | `main` | Web, Android | `in.olivepizza.owner` | `npm run build:frontend` |
| **Owner Backend** | `olive-pizza-owner/backend` | `https://github.com/samyakshrivastava28-maker/Olivepizza-owner.git` | `main` | Node.js Backend | N/A | `tsc` / `npx tsx server.ts` |
| **Franchise** | `olive-pizza-franchise` | `https://github.com/samyakshrivastava28-maker/olive-pizza-franchise.git` | `main` | Web, Electron, Cap Config | `in.olivepizza.franchise` | `tsc && vite build` |
| **Restaurant** | `Olive Pizza restaurant manager` | `https://github.com/samyakshrivastava28-maker/olive-pizza-restaurant.git` | `main` | Web, Electron, Cap Config | `in.olivepizza.manager` | `tsc && vite build` |
| **Delivery** | `olive-pizza-delivery` | `https://github.com/samyakshrivastava28-maker/olive-pizza-delivery.git` | `main` | Web, Cap Config | `in.olivepizza.delivery` | `tsc && vite build` |
| **POS** | `olive-pizza-pos` | `https://github.com/samyakshrivastava28-maker/olive-pizza-pos.git` | `main` | Web, Electron, Cap Config | `in.olivepizza.pos` | `tsc && vite build` |

---

## 4. Canonical Backend Architecture

- **Location:** `olive-pizza-owner/backend`
- **Runtime:** Node.js v20+ with TypeScript (`tsx`)
- **Port & Binding:** `app.listen(Number(PORT), '0.0.0.0')` where `PORT = process.env.PORT || 5000` (Render-compliant)
- **Health Check Routes:**
  - Current: `/health`, `/ready`, `/keep-alive`, `/api/heartbeat`, `/heartbeat`
  - Required additions: `/api/health`, `/api/health/ping` (returns `{ status: 'ok', timestamp: ... }`)
- **Database & Services:**
  - Firebase Admin (`adminDb`, Firestore listener)
  - PostgreSQL pool (`pgPool`, `initPostgres`)
  - Supabase client
  - Cloudinary asset management
  - WebSockets attached at path `/ws`
  - Storage Analyzer and Google Sheets background worker (`SheetsSyncWorker`)
  - Keep-Alive script (`initKeepAlive`)

---

## 5. Public Backend URL Audit

A scan of all frontends revealed inconsistencies in backend URL configuration:
- `Customer`: `.env` specifies `RENDER_PUBLIC_URL=https://olive-pizza-backend.onrender.com`
- `Restaurant`: `src/lib/api.ts` hardcodes fallback `https://olivepizza-owner.onrender.com`
- `Delivery`: `src/lib/api.ts` hardcodes fallback `https://olivepizza-owner.onrender.com`
- `Franchise`, `POS`, `Owner-Frontend`: Fallback to `http://localhost:5000`

**Resolution:**
The canonical backend URL determined from Render must be standardized across all apps to eliminate cross-URL routing issues.

---

## 6. Android & Native Build Status

1. **Customer (`olive-pizza`)**:
   - `android/` directory: **EXISTS**
   - Package: `com.olivepizza.app`
   - Capacitor: v8.4.1
   - Ready for GitHub Actions Android workflow.

2. **Owner (`olive-pizza-owner`)**:
   - `android/` directory: **EXISTS**
   - Package: `in.olivepizza.owner`
   - Capacitor: v8.4.1
   - Ready for GitHub Actions Android workflow.

3. **Franchise, Restaurant, Delivery, POS**:
   - `capacitor.config.ts`: **EXISTS**
   - `android/` directory: Needs Capacitor Android platform initialization (`npx cap add android` or workflow sync) to generate Debug APK artifacts via GitHub Actions.

---

## 7. Next Steps for Implementation

1. Inspect Render services on `olivepizzarjn@gmail.com`.
2. Ensure canonical backend has `/api/health` and `/api/health/ping` routes and runs reliably.
3. Unify canonical backend URL across all client apps.
4. Add `.github/workflows/android-build.yml` for repositories with Android configurations.
5. Verify end-to-end demonstration flow (Customer Order -> Restaurant Accept -> POS Bill -> Delivery Live Tracking).
6. Commit, push, and produce final release reports.
