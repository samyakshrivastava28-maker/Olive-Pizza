# 📊 Olive Pizza — Professional Google Sheets Monthly Accounting & Management Workbook Engine

## 1. Executive Summary & Architecture Overview

The Olive Pizza Google Sheets integration is designed as a **Professional Accounting, Management & Tax Preparation Workbook Engine**.

Each calendar month represents **ONE Complete Reporting Workbook** structured for:
1. **Olive Pizza Owner & Franchise Leadership** (KPIs, Net Sales, Channel Contribution, Product Margins)
2. **Restaurant Operations & Kitchen Managers** (Daily Sales trends, Dine-In / Takeaway / Delivery volumes, POS Cashier shifts)
3. **Chartered Accountants (CA) & Bookkeepers** (Payment Reconciliation, Bank/Cash deposits, 5% GST breakdowns, Discount allocations, Voids & Adjustments)
4. **Statutory Tax & Compliance Records** (2.5% CGST + 2.5% SGST audit trail, verifiable invoice numbers, and complete data traceability without synthetic records)

```
[POS Terminal / Mobile Web App / Online Order]
                    │
                    ▼
          [POST /api/orders] ──► (Instant Order Saved to DB)
                    │
                    ▼
         [SheetsSyncWorker.ts] ◄─── Periodic Cron Sweep (Every 5 Mins)
                    │
     ┌──────────────┴────────────────────────┐
     ▼                                       ▼
[Google Sheets API Live]           [Rate Limit / Network Offline]
     │                                       │
[Idempotent Upsert to              [Mark SYNC_PENDING in Firestore]
  'Order Details' &                          │
  'Raw Billing Data']              [Automatic Exponential Retry]
     │
[All 13 Summary Tabs Auto-Calculate via Live Formulas]
```

---

## 2. 13-Tab Monthly Workbook Structure

For every franchise and month (e.g. `Olive Pizza — Rajnandgaon HQ — 2026-August`), the system automatically provisions and styles 13 dedicated tabs:

| Tab # | Sheet Name | Target Audience | Primary Function & Formula Engines |
|---|---|---|---|
| **1** | **📊 Executive Summary** | Owner / Management | Main dashboard with 6 prominent KPI cards, Sales Overview table, Net Realization, and Collection breakdown. |
| **2** | **📅 Daily Sales** | Management / CA | 31-day calendar ledger with daily orders, gross, discounts, refunds, tax, delivery fees, net, and payment channel splits. |
| **3** | **📈 Sales & Revenue** | Operations / Owner | Breakdown by Order Source (Online App vs POS Dine-in / Takeaway / Delivery) and channel share %. |
| **4** | **🧾 Order Details** | CA / Management | 26-column transaction ledger containing granular bill records, items, taxes, customer details, and terminals. |
| **5** | **💳 Payment Reconciliation** | CA / Accounts | Reconciliation of Cash, UPI (GPay/PhonePe/Paytm), Cards, Online Razorpay, and Split tenders with variance checks. |
| **6** | **🏛️ Tax & GST Summary** | CA / Tax Filing | Taxable Turnover, 2.5% CGST, 2.5% SGST, 5% IGST, output liability schedules, and CA audit status. |
| **7** | **🏷️ Discounts & Coupons** | Marketing / Owner | Promo code redemption volume, marketing discounts, manual POS comp-offs, and net revenue impact. |
| **8** | **↩️ Refunds & Cancellations** | Operations / Audit | Voided bills, cancelled orders, refund payment channels, reasons, and authorization log. |
| **9** | **🍕 Product & Variant Sales** | Kitchen / Owner | Quantities sold, 8"/10"/12" sizes, crust types, gross sales, and top revenue-generating menu items. |
| **10** | **🛵 Channel Analysis** | Operations / Fleet | Channel performance matrix comparing Dine-In vs Takeaway vs Delivery vs Online App adoption. |
| **11** | **👨‍💼 POS & Cashier Summary** | Store Manager | Shift billing volumes, counter cash handled, digital collections, and cashier performance per terminal. |
| **12** | **🛡️ Audit & Adjustments** | Owner / Internal Audit | Change log of manual discounts, price overrides, voided items, and authorized supervisors. |
| **13** | **🗄️ Raw Billing Data** | Technical / BI | Raw system-generated records including JSON items payload for external queries, pivot tables, and backups. |

---

## 3. Order Details Schema (26 Standardized Audit Columns)

| Col | Header Name | Format / Type | Example Value |
|---|---|---|---|
| `A` | `BILL NO` | Formatted Daily Reference | `#1042` |
| `B` | `ORDER ID` | Canonical UUID | `ord_984f1a23-4567-48ef-912a` |
| `C` | `DATE` | Indian Calendar Date | `25/08/2026` |
| `D` | `TIME` | Local 24h Time | `20:15:30` |
| `E` | `ORDER TYPE` | Channel Tag | `POS` / `ONLINE` |
| `F` | `FULFILLMENT` | Service Tag | `DINE_IN` / `TAKEAWAY` / `DELIVERY` |
| `G` | `TABLE NO` | Table / Station ID | `T-04` / `-` |
| `H` | `CUSTOMER NAME` | Customer Name | `Ramesh Kumar` |
| `I` | `CUSTOMER PHONE` | Contact Number | `+91 98765 43210` |
| `J` | `ITEMS SUMMARY` | Comma-delimited items | `2x Farm Fresh 10" Thin, 1x Garlic Bread` |
| `K` | `TOTAL ITEMS` | Integer count | `3` |
| `L` | `SUBTOTAL (₹)` | Base Item Total | `₹680.00` |
| `M` | `DISCOUNT (₹)` | Applied Discount | `₹50.00` |
| `N` | `COUPON CODE` | Promo Code / Method | `FESTIVE50` / `NONE` |
| `O` | `TAXABLE AMT (₹)` | (Subtotal - Discount) | `₹630.00` |
| `P` | `CGST 2.5% (₹)` | Central GST @ 2.5% | `₹15.75` |
| `Q` | `SGST 2.5% (₹)` | State GST @ 2.5% | `₹15.75` |
| `R` | `TOTAL TAX (₹)` | Total 5% GST | `₹31.50` |
| `S` | `DELIVERY FEE (₹)`| Tiered Delivery Fee | `₹0.00` |
| `T` | `FINAL TOTAL (₹)` | Final Invoice Total | `₹661.50` |
| `U` | `PAYMENT METHOD` | Tender Channel | `UPI` / `CASH` / `CARD` / `SPLIT` |
| `V` | `PAYMENT STATUS` | Payment State | `PAID` / `REFUNDED` |
| `W` | `ORDER STATUS` | Execution State | `delivered` / `completed` |
| `X` | `CASHIER / OPERATOR` | Cashier Name | `Priya Sharma` |
| `Y` | `POS TERMINAL` | Terminal ID | `POS-TERM-01` |
| `Z` | `TIMESTAMP` | ISO 8601 UTC | `2026-08-25T14:45:30.000Z` |

---

## 4. Professional Visual Design & Styling Standards

1. **Brand Palette**:
   - **Header Bars**: Deep Obsidian Slate (`#0B0F17` / `#1E293B`) with crisp white bold typography.
   - **Primary Metric Accents**: Olive Pizza Sunset Orange (`#EA580C` / `#F97316`).
   - **Accounting Row Fills**: Alternating Soft Light Tint (`#F8FAFC` & `#FFFFFF`) with clean borders (`#E2E8F0`).
   - **Totals & Summary Rows**: Double-bottom border with Gold/Slate highlight tint (`#FEF3C7` / `#E2E8F0`).
2. **Formatting**:
   - Currency: Indian Rupee (`₹#,##0.00`) applied to all revenue and financial cells.
   - Quantities / Orders: Formatted integers (`#,##0`).
   - Percentages: Standard decimals (`0.0%`).
   - Frozen Header Rows (`frozenRowCount: 1` or `3`) to ensure navigation while scrolling large ledgers.

---

## 5. Secondary Asynchronous Storage & Idempotency Guarantee

- **Non-Blocking Operation**: The POS and Online Checkout flows write to Firestore/PostgreSQL instantly and enqueue a lightweight background task for Google Sheets sync.
- **Idempotency**: All row insertions are matched against `Order ID` in Column B of `'Order Details'`. If an order is already recorded, the row is updated in place, preventing duplicate rows or revenue inflation.
- **Resilience**: If the Google Sheets API is temporarily unreachable or rate-limited, the system marks the order `SYNC_PENDING` in Firestore and the background `SheetsSyncWorker` automatically retries on an exponential schedule.

---

## 6. Operational Endpoints

- `GET /api/reports/monthly`: Returns active spreadsheet ID, monthly workbook title, and direct Google Sheet URL.
- `POST /api/reports/google-sheet/sync`: Triggers on-demand background sync of recent orders.
- `POST /api/reports/google-sheet/set-id`: Configures or updates the target Google Spreadsheet ID in Firestore settings.
- `GET /api/reports/diagnostics`: Provides live system health for Google Sheets, Cloudflare R2, and Email Queue.
