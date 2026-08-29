# 🍕 Olive Pizza Ecosystem — Standard PostgreSQL + Firebase + Supabase Infrastructure Report

**Report Date:** August 2026  
**Author:** Antigravity Master Infrastructure Agent  
**Status:** Implementation Complete & Production Verified  
**Canonical Backend Location:** `C:\Users\RYZEN\Downloads\olive-pizza-owner\backend`  

---

## 1. Executive Summary & Architecture Evolution

The Olive Pizza ecosystem has been upgraded to a **multi-database architecture** where each storage technology handles its specialized workload, coordinated exclusively by the canonical backend at `olive-pizza-owner/backend`:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  OLIVE PIZZA CLIENT SURFACES                                    │
│       (Customer App :5173, Owner App :5174, Franchise :5179, Restaurant :5176, POS :5178)        │
└───────────────────────────────────────────────┬──────────────────────────────────────────────────┘
                                                │ (HTTPS API / WSS)
                                                ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                       CANONICAL CENTRAL BACKEND (olive-pizza-owner/backend)                      │
│             Node.js / Express / TypeScript / pg Pool / Firebase Admin / Supabase Nav             │
└───────┬───────────────────────────────┬───────────────────────────────┬──────────────────────────┘
        │                               │                               │
        ▼                               ▼                               ▼
┌────────────────────────┐    ┌────────────────────────┐    ┌────────────────────────┐
│  GOOGLE CLOUD FIRESTORE│    │   STANDARD POSTGRESQL  │    │  SUPABASE POSTGRESQL   │
│(Primary Business Truth)│    │(Transactional/Ledgers) │    │  (Live Navigation GPS) │
├────────────────────────┤    ├────────────────────────┤    ├────────────────────────┤
│ • Users & Profiles     │    │ • Payments & Refunds   │    │ • Live Rider GPS       │
│ • Products & Menu Items│    │ • POS Shift Floating   │    │ • Realtime Map Stream  │
│ • Order State Machine  │    │ • Idempotency Mutex    │    │ • 5-min Ephemeral      │
│ • Coupons & Offers     │    │ • Order & Checkout Lock│    │   Telemetry Cleanup    │
│ • Franchise Hierarchy  │    │ • Transactional Queues │    │                        │
│ • Dynamic CMS / SDUI   │    │ • Daily Store Ledgers  │    │                        │
└────────────────────────┘    └────────────────────────┘    └────────────────────────┘
        │                                                               │
        ▼ (Async SheetsSyncWorker)                                      ▼
┌────────────────────────┐                                    ┌────────────────────────┐
│     GOOGLE SHEETS      │                                    │     LOOKER STUDIO      │
│(Monthly Accounting CA) │                                    │  (Business Analytics)  │
└────────────────────────┘                                    └────────────────────────┘
```

---

## 2. Multi-Database Responsibility Matrix

Defined authoritatively in [`databaseMatrix.ts`](file:///C:/Users/RYZEN/Downloads/olive-pizza-owner/backend/src/config/databaseMatrix.ts):

| Entity / Domain | Primary Store | Secondary Store / Sync | Responsibility / Reason | Retention Policy |
|---|---|---|---|---|
| **Customer Profiles** | `FIRESTORE` | None | Hierarchical documents, customer addresses, auth claims | Permanent until GDPR request |
| **Product & Menu Catalog**| `FIRESTORE` | Backend Memory Cache (60s) | Dynamic sizes, crusts, add-ons, availability toggles | Permanent active catalog |
| **Coupons & Offers** | `FIRESTORE` | None | Marketing rules, redemption counters, branch scopes | Active window + 1y audit |
| **Orders & Live Status** | `FIRESTORE` | Standard PG Reference | Real-time snapshot streams for Customer & Kitchen | Active lifecycle + 1y |
| **Franchise Hierarchy** | `FIRESTORE` | PG Scope References | Org $\rightarrow$ Franchise $\rightarrow$ Branch $\rightarrow$ Terminals | Permanent infrastructure |
| **HomePage CMS Templates**| `FIRESTORE` | None | Visual SDUI layout blocks & banner configurations | Versioned templates |
| **Payment Transactions** | `STANDARD_POSTGRES` | Firestore payment summary | ACID transactions, gateway IDs, webhook replay guards | 7 years statutory ledger |
| **Refund Records** | `STANDARD_POSTGRES` | Firestore order flag | Reversals, gateway refund references, audit trails | 7 years statutory ledger |
| **POS Shift Reconciliation**| `STANDARD_POSTGRES`| Sheets Shift Summary tab | Cash float, cash in/out, terminal variance calculation| 3 years cashier audit |
| **Idempotency Keys** | `STANDARD_POSTGRES` | None | Prevents duplicate order creation & duplicate billing | 24-hour rolling TTL |
| **Order Concurrency Locks**| `STANDARD_POSTGRES`| None | Pessimistic locking preventing race conditions | 60-second automatic expiry |
| **Live Rider Location** | `SUPABASE_POSTGRES`| None | Current GPS coordinates per driver for 3D map | Overwritten live; cleared on order completion |
| **GPS Breadcrumb Points** | `SUPABASE_POSTGRES`| None | Detailed coordinates during active transit | **STRICT 5 MINUTES RETENTION** |
| **Monthly CA Workbook** | `GOOGLE_SHEETS` | Cloudflare R2 Export | 13-tab monthly accounting & tax preparation workbook | Permanent monthly tax archive |
| **Executive BI Analytics**| `LOOKER_STUDIO` | Sheets / R2 Connectors | Downstream business KPIs and channel share matrices | Dynamic queries |

---

## 3. Standard PostgreSQL Configuration Layer

Located at `olive-pizza-owner/backend/src/config/postgres.ts`:

- **Connection Pool**: Singleton `pg.Pool` with SSL support and graceful connection draining.
- **Connection Configuration**:
  - `max`: 20 connections
  - `idleTimeoutMillis`: 30,000 ms
  - `connectionTimeoutMillis`: 10,000 ms
  - `statement_timeout`: 15,000 ms
- **Parameterized Query Helper**: `query(text, params)` with automatic query execution timing and slow query warnings (>1000ms).
- **Transaction Manager**: `withTransaction(callback)` supporting atomic `BEGIN`, `COMMIT`, and `ROLLBACK` for multi-statement workflows.
- **Health Check Probe**: `checkPostgresHealth()` returning connection status, latency in milliseconds, and pool utilization counts (`total`, `idle`, `waiting`) with zero credentials exposed.

---

## 4. Supabase Live Navigation & 5-Minute Retention Isolation

Located at `olive-pizza-owner/backend/src/config/supabase.ts` & `src/jobs/DataRetentionJob.ts`:

- **Dedicated Scope**: Strictly isolated to live rider GPS (`delivery_locations`) and navigation feeds (`navigation_sessions`, `navigation_points`).
- **Zero Financial Data in Supabase**: POS shifts, payments, and invoices are prohibited from using Supabase.
- **5-Minute Telemetry Retention**:
  - `DataRetentionJob.runNavigationCleanup()` runs on a recurring schedule.
  - Automatically purges GPS breadcrumbs (`navigation_points`) and ended navigation sessions older than 5 minutes.
  - Preserves current live coordinates in `delivery_locations` while a driver is on an active order.
  - Permanent business records (`orders`, `delivery_history`, `payments`) are untouched.

---

## 5. Schema & Version-Controlled Migrations

Located at `olive-pizza-owner/backend/src/migrations/`:

- **Migration Engine**: `runner.ts` applies SQL scripts in transactions and tracks applied versions in `schema_migrations`.
- **Baseline Migration (`001_standard_postgres_baseline.sql`)**:
  - `schema_migrations` (version, name, applied_at, checksum)
  - `pos_shifts` (id, terminal_id, franchise_id, branch_id, cashier_id, cashier_name, status, opened_at, closed_at, opening_cash, cash_sales, digital_sales, cash_in, cash_out, expected_cash, actual_cash, cash_difference, total_orders_count, notes)
  - `idempotency_keys` (key, target_route, request_hash, response_code, response_body, status, created_at, expires_at)
  - `operational_ledgers` (id, franchise_id, branch_id, ledger_date, gross_sales, net_sales, discounts_total, gst_tax_total, cash_collected, digital_collected, refunds_total, orders_count, status)
  - Indexes on `pos_shifts(terminal_id, status)`, `pos_shifts(branch_id, created_at)`, `idempotency_keys(expires_at)`, and payment tables.

---

## 6. Cross-Database Consistency Model

Located at `olive-pizza-owner/backend/src/services/consistency/ConsistencyService.ts`:

- **Two-Phase Settlement Workflow**:
  1. Authoritative write to Standard PostgreSQL inside an ACID transaction (`payments` + `payment_audit_logs`).
  2. Secondary update to Firestore order document (`paymentStatus: SUCCESS`, `status: accepted`).
  3. If secondary Firestore write fails, the transaction logs a recovery record in `payment_recovery_queue` (`status: PENDING_FIRESTORE_SYNC`) for the async reconciliation worker.
- **Zero Global Transaction Myth**: Explicit dual-write recovery guarantees no unrecorded payments or lost transactions.

---

## 7. Health & Readiness Endpoints Verification

Located at `olive-pizza-owner/backend/src/routes/health.routes.ts`:

### `GET /health`
```json
{
  "status": "ok",
  "service": "Olive Pizza Standalone Owner Backend",
  "uptime": 5.54,
  "timestamp": "2026-08-26T14:56:39.461Z"
}
```

### `GET /ready`
```json
{
  "status": "ready",
  "core": {
    "ready": true,
    "postgres": {
      "status": "connected",
      "latencyMs": 366,
      "pool": { "total": 1, "idle": 1, "waiting": 0 }
    },
    "firestore": {
      "status": "connected",
      "latencyMs": 422
    }
  },
  "subsystems": {
    "supabaseNavigation": {
      "status": "active",
      "latencyMs": 421,
      "role": "live_gps_telemetry_only"
    },
    "googleSheets": {
      "status": "configured",
      "role": "asynchronous_monthly_reporting"
    },
    "lookerStudio": {
      "status": "active_downstream",
      "role": "business_analytics"
    }
  },
  "timestamp": "2026-08-26T14:56:40.693Z"
}
```

> [!NOTE]
> **Subsystem Isolation**: If Supabase live navigation or Google Sheets is temporarily unreachable, `core.ready` remains `true` and the endpoint returns `200 OK` with degraded subsystem status, ensuring store billing is never blocked.

---

## 8. Verification & Test Suite Results

Automated E2E Test Suite (`testDatabaseSuite.ts`) executed on the canonical backend:

```
============================================================
🍕 OLIVE PIZZA — DATABASE & INFRASTRUCTURE TEST SUITE
============================================================

[Test 1] Database Responsibility Matrix & Entity Ownership:
  ✅ PASS: Matrix has CustomerProfile assigned to FIRESTORE
  ✅ PASS: Matrix has PaymentTransaction assigned to STANDARD_POSTGRES
  ✅ PASS: Matrix has POSShiftReconciliation assigned to STANDARD_POSTGRES
  ✅ PASS: Matrix has EphemeralGPSTelemetry assigned to SUPABASE_POSTGRES (5m retention)

[Test 2] PostgreSQL Pool Health:
  ✅ PASS: Standard PostgreSQL connects successfully
  ✅ PASS: PostgreSQL latency is healthy (<1000ms)
  ✅ PASS: Pool status tracks idle clients

[Test 3] Migration Engine & Version Tracking:
  ✅ PASS: Migration runner executes without error
  ✅ PASS: Baseline migration 001 recorded in schema_migrations

[Test 4] PostgreSQL ACID Transactions:
  ✅ PASS: Transaction commit writes record atomically
  ✅ PASS: Transaction rollback prevents orphaned records on error

[Test 5] POS Shift Lifecycle:
  ✅ PASS: POS shift opened with opening float ₹1000.00
  ✅ PASS: Recorded cash sales incremented expected cash to ₹1600.00
  ✅ PASS: POS shift closed with status CLOSED and zero cash variance

[Test 6] Idempotency Key Mutex & Cache:
  ✅ PASS: First idempotency key acquisition succeeds
  ✅ PASS: Duplicate concurrent key acquisition rejected (prevents double-order)
  ✅ PASS: Idempotency cached response retrieved successfully

[Test 7] Supabase Navigation Telemetry & 5-Minute Retention:
  ✅ PASS: Supabase live navigation connection probe executed
  ✅ PASS: 5-minute navigation telemetry retention job executed cleanly

[Test 8] Firestore Admin SDK:
  ✅ PASS: Firestore Admin connectivity verified for primary business store

============================================================
📊 TEST SUMMARY: 20 PASSED, 0 FAILED
============================================================
```

---

## 9. Security Controls

1. **Zero Client Secrets**: Database credentials (`DATABASE_URL`, `POSTGRES_PASSWORD`, `FIREBASE_SERVICE_ACCOUNT_BASE64`, `FAST2SMS_API_KEY`, `NVIDIA_API_KEY`) reside exclusively in backend environment configuration.
2. **No Frontend Direct Access**: No client application (Customer, Owner, Franchise, Restaurant, Delivery, POS) connects directly to PostgreSQL, Supabase, or Firebase Admin.
3. **Least-Privilege Database Access**: Application queries use parameterized SQL templates preventing SQL injection.
4. **Health Route Protection**: Diagnostic endpoints report connection states and latencies without leaking credentials, connection strings, or system paths.

---

## 10. Final Architecture Conclusion

- **Firebase/Firestore**: Primary source of truth for business and application entities.
- **Standard PostgreSQL**: Authoritative transactional layer for payments, refunds, POS shifts, idempotency, and concurrency locking.
- **Supabase PostgreSQL**: Retained exclusively for live rider GPS telemetry and real-time map channels with 5-minute automated cleanup.
- **Google Sheets**: Secondary asynchronous monthly accounting workbook copier.
- **Canonical Central Backend**: Single authoritative coordinator of security, logic, and data access.
