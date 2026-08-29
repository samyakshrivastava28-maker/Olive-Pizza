# 🛡️ Olive Pizza Ecosystem — Role-Based Access Control (RBAC) & Scope Specification

## 1. Canonical Roles

The Olive Pizza platform enforces **8 canonical roles**:

| Canonical Role | System Scope | Target Surface | Permissions |
|---|---|---|---|
| `platform_owner` | Global (All franchises, all branches) | Owner App (`port 5174`) | Full administrative access to all entities, financial metrics, and CMS. |
| `franchise_owner` | Franchise (All branches in assigned franchise) | Owner App (`port 5174`) | Regional reports, branch provisioning, regional menu overrides. |
| `restaurant_manager` | Branch (Strictly assigned `branchId`) | Restaurant Manager App (`port 5176`) | Live kitchen queue, order history, branch delivery management, local notifications. |
| `kitchen_staff` | Branch (Strictly assigned `branchId`) | Kitchen Display / Manager App | View active cooking queue, advance order state (`preparing` $\rightarrow$ `ready`). |
| `delivery_partner` | Branch (Strictly assigned `branchId`) | Delivery Partner App (`port 5177`) | Accept orders, 3D turn-by-turn navigation, 100m delivery completion verification. |
| `cashier` | Branch + Terminal (`branchId` + `terminalId`) | POS Billing App (`port 5178`) | Touch billing grid, dine-in table assignment, receipt printing, payment settlement. |
| `customer` | User (Self-isolated UID) | Customer App (`port 5173`) | Menu browsing, cart, checkout, own order tracking, address book, account deletion. |
| `developer` | Global (Development / Diagnostics) | All surfaces | Technical diagnostics, database management, background task monitoring. |

---

## 2. Authorized Internal Master Accounts

The following accounts are hardcoded with immutable Global Owner override claims:
- `webhub2811@gmail.com`
- `olivepizzarjn@gmail.com`

---

## 3. Granular Permissions Matrix

| Permission String | Permitted Roles | Functionality |
|---|---|---|
| `orders.manage` | `platform_owner`, `franchise_owner`, `restaurant_manager`, `developer` | Accept, cancel, refund, or change order status. |
| `orders.create` | `customer`, `cashier`, `platform_owner`, `restaurant_manager` | Place a new customer or counter POS order. |
| `orders.read` | `customer` (own), `kitchen_staff`, `cashier`, `restaurant_manager`, `platform_owner` | View order details. |
| `menu.manage` | `platform_owner`, `franchise_owner`, `developer` | Create, edit, delete, or price products and combos. |
| `delivery.manage` | `platform_owner`, `franchise_owner`, `restaurant_manager` | Assign riders, toggle rider online status, view live fleet radar. |
| `delivery.execute` | `delivery_partner` | Accept assigned delivery, update GPS, complete delivery at $<100\text{m}$. |
| `pos.manage` | `cashier`, `platform_owner`, `restaurant_manager` | Authenticate POS terminal, generate thermal bills, apply POS discounts. |
| `franchises.manage` | `platform_owner`, `developer` | Provision new branches, assign franchise owners, update regional boundaries. |
| `reports.read` | `platform_owner`, `franchise_owner`, `developer` | Access financial revenue reports, Google Sheets accounting, Cloudflare R2 PDFs. |

---

## 4. Multi-Tenant Branch Scope Enforcement

- Implemented via `requireBranchScope()` and `FranchiseScopeService.isAuthorizedForBranch()` in `backend/src/middleware/auth.middleware.ts`.
- If a user has role `restaurant_manager` assigned to `main_branch`, any attempt to query or mutate orders from `durg_branch` is rejected with `HTTP 403 Forbidden`.
- Client-supplied `branchId` in query strings or request bodies is automatically overridden by the verified branch scope in the user's session.
