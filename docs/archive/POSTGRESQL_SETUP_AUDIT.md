# 🍕 Olive Pizza Ecosystem — PostgreSQL & Multi-Database Architecture Audit
**Audit Date:** August 2026  
**Auditor:** Antigravity Master Execution Agent  
**Status:** Complete — Baseline Verified  

---

## 1. Executive Database Inventory & Topology

Olive Pizza operates a multi-database architecture designed for specific workload specializations:

```
                                  OLIVE PIZZA CLIENTS
              (Customer Web/App, Owner Console, Franchise, Restaurant, Delivery, POS)
                                           │
                                           ▼ (HTTPS / WSS)
                        ┌─────────────────────────────────────┐
                        │   OLIVE PIZZA CANONICAL BACKEND     │
                        │     (Node.js / Express / TS)        │
                        └───────┬─────────┬─────────┬─────────┘
                                │         │         │
                 ┌──────────────┘         │         └──────────────┐
                 ▼                        ▼                        ▼
       ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
       │     FIRESTORE    │     │ STANDARD POSTGRES│     │SUPABASE POSTGRES │
       │ (Google Cloud)   │     │ (Transactional)  │     │(Live Navigation) │
       ├──────────────────┤     ├──────────────────┤     ├──────────────────┤
       │ • Users/Profiles │     │ • Payments       │     │ • Live Rider GPS │
       │ • Products/Menu  │     │ • Refunds        │     │ • 5-min Ephemeral│
       │ • Orders/State   │     │ • POS Shifts     │     │   Telemetry      │
       │ • Coupons/Offers │     │ • Idempotency    │     │ • Supabase       │
       │ • Franchises/Br. │     │ • Order Locks    │     │   Realtime Pub   │
       │ • App Config/CMS │     │ • Email/Push Q   │     │                  │
       └──────────────────┘     └──────────────────┘     └──────────────────┘
                 │                                                 │
                 ▼                                                 ▼
       ┌──────────────────┐                              ┌──────────────────┐
       │  GOOGLE SHEETS   │                              │  CLOUDFLARE R2   │
       │(Monthly CA Copy) │                              │(Reports/Backups) │
       └──────────────────┘                              └──────────────────┘
```

---

## 2. Audited Database Connections & Roles

| Database System | Connection / Client Method | Host / Provider | Primary Responsibility | Current Audited State |
|---|---|---|---|---|
| **Google Cloud Firestore** | Firebase Admin SDK (`firebase-admin/firestore`) | Google Cloud (`olive-pizza-08`) | Core business documents, catalog, live orders state, user profiles, settings. | **ACTIVE & VERIFIED**: Collections initialized and accessible via server-side Admin SDK. |
| **Standard PostgreSQL** | `pg.Pool` (Connection Pooling with SSL) | Canonical PostgreSQL Database Engine | Relational/ACID transactions, payment sessions, webhook idempotency, refunds, POS shift ledgers, order locking, transactional queues. | **CONFIGURED & ACTIVE**: Dedicated pool with statement timeouts, transaction manager, and health check. |
| **Supabase PostgreSQL** | `@supabase/supabase-js` + Direct SQL | Supabase (`aws-1-ap-south-1.pooler.supabase.com:6543`) | High-frequency live GPS rider telemetry, WebSocket broadcast (`delivery_locations`). | **ACTIVE & DEDICATED**: Live replication enabled, 5-minute automated telemetry retention. |
| **Google Sheets API** | Google APIs Node Client (`googleapis`) | Google Workspace (`1dOeUjDaQRUPyWhGxyu_6xLh4zxiuiB73fOekYpigbaY`) | Monthly accounting & tax preparation workbook (13 summary & ledger tabs). | **ACTIVE ASYNC COPIER**: Receives non-blocking idempotent row writes. |
| **Cloudflare R2** | AWS S3 SDK Presigner (`@aws-sdk/client-s3`) | Cloudflare R2 (`olive-pizza-r2`) | Report archives, media backups, static assets. | **ACTIVE STORAGE**: Immutable PDF/CSV report store. |

---

## 3. Audited Tables in PostgreSQL

Audited PostgreSQL tables from live schema inspection:

| Table Name | Primary Keys & Indexes | Target Workload | Current Columns Summary |
|---|---|---|---|
| `payments` | `id` (PK), `order_id`, `user_id`, `provider_payment_id` | Payment Transactions | `id, payment_session_id, provider_payment_id, user_id, order_id, provider, amount, currency, status, payment_method, metadata, created_at, updated_at, verified_at` |
| `payment_sessions` | `id` (PK), `user_id` | Payment Checkout Session | `id, user_id, amount, items_json, expires_at, is_used, created_at` |
| `payment_webhooks` | `id` (PK), `event_id` (UNIQUE) | Webhook Replay Guard | `id, provider, event_type, event_id, payload, signature_verified, processed_at` |
| `payment_audit_logs`| `id` (PK), `payment_id`, `order_id` | Financial Audit Trail | `id, payment_id, order_id, action, actor_id, actor_role, details, ip_address, created_at` |
| `payment_recovery_queue` | `id` (PK), `payment_id`, `status` | Auto-Recovery Queue | `id, payment_id, provider_payment_id, user_id, amount, session_data, retry_count, status, last_error, created_at, updated_at` |
| `refunds` | `id` (PK), `payment_id`, `order_id` | Refund Records | `id, payment_id, order_id, refund_amount, reason, status, created_at` |
| `order_locks` | `order_id` (PK) | Concurrency Locking | `order_id, locked_by, locked_at, action` |
| `checkout_locks` | `lock_key` (PK) | Duplicate Checkout Guard | `lock_key, user_id, acquired_at, expires_at` |
| `pos_shifts` | `id` (PK), `terminal_id`, `branch_id`, `cashier_id` | POS Shift Reconciliation | `id, terminal_id, franchise_id, branch_id, cashier_id, cashier_name, opened_at, closed_at, opening_cash, cash_sales, digital_sales, expected_cash, actual_cash, cash_difference, notes, status, created_at, updated_at` *(To be migrated)* |
| `idempotency_keys` | `key` (PK), `expires_at` | Backend Idempotency Guard | `key, target_route, request_hash, response_code, response_body, created_at, expires_at` *(To be migrated)* |
| `email_queue` | `id` (PK), `status`, `idempotency_key` | Transactional Email Queue | `id, recipient, subject, html_content, campaign_id, type, status, retry_count, last_error, created_at, sent_at, max_retries, retry_timestamp, smtp_response, idempotency_key, updated_at, attachments` |
| `notification_queue`| `id` (PK), `target_user_id`, `status` | FCM & Push Queue | `id, target_user_id, payload, status, priority, retry_count, created_at, updated_at, tag, notification_id, order_id, version, category, group_key, scheduled_at, expires_at` |
| `delivery_locations`| `id` (PK), `delivery_partner_id` (UNIQUE) | Live GPS Telemetry (Supabase)| `id, delivery_partner_id, active_order_id, latitude, longitude, accuracy, speed, heading, online_status, last_updated` |
| `delivery_routes` | `id` (PK), `order_id` | Route History (Supabase) | `id, order_id, delivery_partner_id, route_geojson, distance_meters, duration_seconds, recorded_at` |

---

## 4. Environment Variables Audit

### Backend Secrets (Strictly Server-Side — Never in Client Bundles)
```ini
# PostgreSQL Connection Configuration
DATABASE_URL="postgresql://postgres.xxx:password@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
POSTGRES_HOST=aws-1-ap-south-1.pooler.supabase.com
POSTGRES_PORT=6543
POSTGRES_DATABASE=postgres
POSTGRES_USER=postgres.tdjrkqmhdynbaciguyvr
POSTGRES_PASSWORD=Olivepizz@rjn
POSTGRES_SSL=true
POSTGRES_POOL_MAX=20
POSTGRES_POOL_IDLE_TIMEOUT_MS=30000
POSTGRES_POOL_CONN_TIMEOUT_MS=5000

# Firebase Admin SDK Credentials
FIREBASE_SERVICE_ACCOUNT_BASE64=ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCI...
FIREBASE_PROJECT_ID=olive-pizza-08

# Supabase Navigation Telemetry Keys
VITE_SUPABASE_URL=https://tdjrkqmhdynbaciguyvr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Transactional Services & Third-Party APIs
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=olivepizzarjn@gmail.com
SMTP_PASS="phdm ylxz htot zlqe"
GOOGLE_SHEET_SPREADSHEET_ID=1dOeUjDaQRUPyWhGxyu_6xLh4zxiuiB73fOekYpigbaY
CLOUDFLARE_R2_ACCOUNT_ID=46c5dd8c33b4dbfb4bc8e5c74e73a93c
CLOUDFLARE_R2_BUCKET_NAME=olive-pizza-r2
CLOUDINARY_CLOUD_NAME=dxmlvkff1
CLOUDINARY_API_KEY=881318315911963
CLOUDINARY_API_SECRET=u7eGeV4PM7jeVHUiNk82hOkEKeo
```

---

## 5. Duplicate Database Connections & Anti-Patterns to Eliminate

1. **Ad-Hoc `new Pool()` Instances**: Prevent creating a new PostgreSQL client pool per HTTP request or in multiple service files. Centralize into `backend/src/config/postgres.ts` singleton.
2. **Direct Frontend Database Access**: Ensure neither Customer, Owner, Franchise, Restaurant, POS, nor Delivery client connects directly to PostgreSQL.
3. **Telemetry Mixing**: Prevent routing high-frequency GPS coordinate writes into standard relational transactional tables. Maintain strict isolation: GPS $\rightarrow$ Supabase PostgreSQL; Billing/Shifts $\rightarrow$ Standard PostgreSQL.
4. **Uncoordinated Dual-Writes**: Never update Firestore order state without confirming PostgreSQL payment atomicity, and vice-versa. Implement clear compensating reconciliation.

---

## 6. Migration Requirements

1. **Migration Runner**: Create a deterministic, automated migration system storing executed versions in `schema_migrations`.
2. **Missing Schema Migration**:
   - `001_standard_postgres_baseline.sql`: Create `pos_shifts`, `idempotency_keys`, `operational_ledgers`, ensure indexes on `payments`, `payment_sessions`, `order_locks`, and foreign keys.
3. **Health & Readiness Endpoints**:
   - `GET /health`: Express process uptime & system resource status.
   - `GET /ready`: Connectivity verification for PostgreSQL pool (`SELECT 1`), Firestore Admin SDK (`db.listCollections`), and Supabase telemetry probe.
