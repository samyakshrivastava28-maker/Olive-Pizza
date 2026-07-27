# Standing Regression Checklist — Olive Pizza Infrastructure & Live Updates

This document serves as the permanent, standing regression checklist for Olive Pizza. Any structural change to notifications, reporting, live updates, or database sync MUST be validated against this checklist before release.

---

## 1. Google Drive Business Report Sync

- [ ] **Credentials Path Resolution**: Check that `GOOGLE_DRIVE_SERVICE_ACCOUNT_PATH` in `backend/.env` resolves correctly regardless of whether `process.cwd()` is project root or `backend/` directory.
- [ ] **Service Account Auth**: Verify `googleDriveService.getHealthStatus()` returns `connected: true` with valid user email (`olive-pizza-drive-handler@olive-pizza-08.iam.gserviceaccount.com`).
- [ ] **Folder Access**: Verify target `GOOGLE_DRIVE_FOLDER_ID` is shared with the Service Account email with Editor/Writer access.
- [ ] **Report Generation**: Execute manual report trigger `POST /api/reports/generate-weekly` and verify PDF file is created, stored in Firestore `reports`, uploaded to Google Drive, and emailed to owner.

---

## 2. Real-Time Live Update Reliability (Per Surface)

### A. Customer Order Tracking (`/order-tracking/:orderId`)
- [ ] **Firestore Status Listener**: Verify `onSnapshot(doc(db, "orders", orderId))` fires on status transitions (`pending` → `accepted` → `preparing` → `ready` → `out_for_delivery` → `delivered`).
- [ ] **Supabase GPS Realtime**: Verify `supabase.channel("tracking-ORDER_ID").on("postgres_changes")` receives live latitude/longitude/heading updates from `delivery_locations`.
- [ ] **Pinned Live Notification**: Verify Android pinned notification updates in-place without creating duplicate notification cards.

### B. Owner Control Center (`/owner/live-order` & `LiveOrdersTable.tsx`)
- [ ] **Multi-Device Realtime Sync**: Accepting/updating an order on Owner Device A updates the UI on Owner Device B instantly via `onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')))` without page refresh.
- [ ] **Sound & Toast Trigger**: Verify audio chime plays when a new order lands in `pending` state.

### C. Owner Live Map Modal (`OwnerLiveMapModal.tsx`)
- [ ] **Supabase Rider Subscription**: Verify opening the Track Live modal subscribes to `supabase.channel("owner-track-ORDER_ID")` and moves the 3D rider marker in real time.
- [ ] **Stale Indicator**: Verify stale position indicator triggers if no GPS update is received for >30 seconds.

### D. Delivery Partner Dashboard (`DeliveryDashboard.tsx`)
- [ ] **Assignment Listener**: Verify `onSnapshot(query(collection(db, "orders"), where("deliveryPartnerId", "==", user.uid)))` pops up new assignment card and plays audio alert.
- [ ] **GPS Location Publishing**: Verify active delivery partner updates `public.delivery_locations` in Supabase (or native background service) every 3–5 seconds.

---

## 3. Production Automatic Notification Pipeline

- [ ] **Owner Alarm (New Order)**: Verify `firestore.listener.ts` triggers fast direct FCM push + queue backup on new order addition.
- [ ] **Customer Push (Status Update)**: Verify customer receives push notifications on `accepted`, `preparing`, `out_for_delivery`, `delivered`, and `cancelled`.
- [ ] **Delivery Alarm (New Assignment)**: Verify delivery partner receives high-priority alarm notification when assigned to an order.
- [ ] **FCM Token Cleanup**: Verify invalid tokens (`messaging/registration-token-not-registered`) are deactivated in Postgres `fcm_tokens` and removed from Firestore `users.fcmTokens` without throwing uncaught errors.
