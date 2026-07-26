# Standing Regression Checklist — Olive Pizza

This runbook defines the mandatory verification suite that MUST be executed after every major change, feature release, or security hardening round before calling work completed.

---

## 1. Recipient Isolation & Target Resolution Matrix (BUG-5 Safeguard)

- [ ] **Customer Isolation**: Confirm customer push notifications and emails land ONLY on the genuine customer account's device/inbox.
- [ ] **No Admin Sweeping**: Confirm customer update routes (`/api/notifications/action`) do NOT query `role == owner` or default to `webhub2811@gmail.com` when customer UID is specified.
- [ ] **Order UIDs**: Confirm `customerFirebaseUid` resolves via fallback chain (`customerUid` || `firebaseUid` || `customerId` || `userId`).

---

## 2. Notification & Alarm Payload Matrix (BUG-2 & BUG-4 Safeguard)

Test FCM pushes across all 12 combinations:

| Role | State | Category / Stage | Expected Behavior |
| :--- | :--- | :--- | :--- |
| **Owner** | Foreground | `alarm_actionable` | Non-empty Title/Body in tray + Full-screen `AlarmActivity` popup with ringing sound. |
| **Owner** | Background | `alarm_actionable` | Non-empty Title/Body in tray + Full-screen `AlarmActivity` popup with ringing sound. |
| **Owner** | Killed | `alarm_actionable` | Non-empty Title/Body in tray + Full-screen `AlarmActivity` popup with ringing sound. |
| **Delivery** | Foreground | `alarm_actionable` | Non-empty Title/Body + Full-screen assignment alert. |
| **Delivery** | Background | `alarm_actionable` | Non-empty Title/Body + Full-screen assignment alert. |
| **Delivery** | Killed | `alarm_actionable` | Non-empty Title/Body + Full-screen assignment alert. |
| **Customer** | Foreground | `pinned_live` | Tray banner + live tracking card update (NO alarm ringing). |
| **Customer** | Background | `pinned_live` | Tray banner + live tracking card update (NO alarm ringing). |
| **Customer** | Killed | `pinned_live` | System tray notification with non-empty Title and Body (NO alarm ringing). |
| **Customer** | Foreground | `marketing` | Promotional notification in tray. |
| **Customer** | Background | `marketing` | Promotional notification in tray. |
| **Customer** | Killed | `marketing` | Promotional notification in tray. |

---

## 3. Role-Gated Permissions & Channel Verification (New Requirement)

- [ ] **Customer App Download**: Open app on fresh install without logging in. Confirm NO full-screen alarm permission prompt (`ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT`) appears.
- [ ] **Customer Login**: Login as Customer. Confirm only standard notification channels (`olive_order_status`, `olive_marketing`) are registered. NO alarm channels (`olive_order_alarm_v5`) registered.
- [ ] **Staff Login**: Login as Owner or Delivery Partner. Confirm role resolution triggers full-screen alarm permission prompt and registers staff alarm channels (`olive_order_alarm_v5`, `olive_delivery_alarm_v5`).

---

## 4. Map & Live Tracking Matrix (BUG-1 & BUG-3 Safeguard)

- [ ] **Browser Dev Console**: Inspect map pages (`/`, `/tracking/:id`, `/owner/live-map`) for CSP violation errors. Zero CSP errors allowed.
- [ ] **Tile Server Failover**: Verify vector tiles (`tiles.openfreemap.org`) load seamlessly. Test failover by simulating network drop to confirm CartoDB Voyager tiles load as automatic backup.
- [ ] **Live Location Streaming**: Verify delivery partner GPS updates stream to PostgreSQL `delivery_locations` and Supabase Realtime at 3-second sub-meter intervals.
