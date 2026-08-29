# 🧾 Olive Pizza POS — Counter Billing Terminal Specification & Operational Guide (v2.2)

## 1. System Mission & Core Architecture

The Olive Pizza POS is the restaurant's **physical counter billing terminal** designed for in-store cashier and counter staff. It is **NOT** a customer-facing website or an online order dashboard.

When a customer walks in, sits down to dine, orders takeaway, or calls the store for direct delivery, the cashier uses the POS terminal to manually build the order, calculate taxes and discounts, collect payment, print thermal receipts, notify the kitchen display board, and synchronize the transaction live to Google Sheets.

```
                  ┌─────────────────────────────────┐
                  │        WALK-IN CUSTOMER         │
                  │   (Dine-In, Takeaway, Phone)    │
                  └────────────────┬────────────────┘
                                   │
                                   ▼
                  ┌─────────────────────────────────┐
                  │      CASHIER COUNTER POS        │
                  │        (Port 5178 Terminal)     │
                  └────────────────┬────────────────┘
                                   │
                                   ▼
                  ┌─────────────────────────────────┐
                  │   CANONICAL BACKEND / ORDERS    │
                  │   (Single Source of Business)   │
                  └────────┬───────────────┬────────┘
                           │               │
            ┌──────────────▼──────┐ ┌──────▼──────────────┐
            │   KITCHEN DISPLAY   │ │    GOOGLE SHEETS    │
            │  (Real-time Queue)  │ │ (Live 22-Col Sheet) │
            └─────────────────────┘ └─────────────────────┘
```

---

## 2. Order Sources & Operating Modes

| Order Mode | `orderSource` Value | Required Inputs | Workflow Behavior |
|---|---|---|---|
| **Dine-In** | `POS_DINE_IN` | Table Number (`T-1` to `T-12`), items, size, crust, addons | Auto-assigns table, customer name/phone optional. |
| **Takeaway** | `POS_TAKEAWAY` | Items, size, crust, addons | Direct counter pickup, customer name/phone optional. |
| **Phone Delivery** | `POS_DELIVERY` | Customer phone, name, delivery street address, delivery fee | Routes to store delivery partner queue with delivery fee. |
| **Manual Restaurant** | `OFFLINE_RESTAURANT` | Standard order items | Backward-compatible tag for historical manual orders. |

---

## 3. Cashier Speed & Keyboard Shortcuts

- **`F2`**: Instant focus on Product Search bar.
- **`F4`**: Reset / Clear Current Bill.
- **`F8`**: Toggle Recent Bills History Drawer & Thermal Reprints.
- **`F9` / `Enter`**: Open Settle & Payment modal.
- **`Esc`**: Close any active modal.

---

## 4. Product Customization & Real-time Calculations

1. **Sizes**: 8" Regular, 10" Medium (+₹90), 12" Large (+₹180).
2. **Crusts**: Classic Hand-Tossed, Thin & Crispy (+₹40), Cheese Burst (+₹80).
3. **Addons**: Extra Mozzarella (+₹60), Fresh Paneer (+₹50), Sliced Olives (+₹40), Grilled Mushrooms (+₹40), Jalapenos (+₹30).
4. **Kitchen Notes Chips**: "No Onion", "No Capsicum", "Less Spicy", "Extra Spicy", "Extra Sauce", "Crispy Well-Done", "Cut into 6 Slices", "Cut into 8 Slices".
5. **Taxes & Discounts**:
   - Subtotal calculated in real time.
   - Quick Cashier Discounts (5%, 10%, 15%, Flat ₹50, Flat ₹100).
   - 5% GST calculated on discounted taxable amount.
   - Strict server-side recalculation and verification on order creation.

---

## 5. Payment & Change Due Calculations

- **Cash**: Cash Received input + Quick Tender buttons (Exact, ₹100, ₹200, ₹500, ₹1000, ₹2000) with automatic **Change Due** calculation (e.g. ₹1000 received for ₹603 total $\rightarrow$ ₹397 Change Due).
- **UPI QR**: Live dynamic UPI QR code (`upi://pay?pa=olivepizza.rjn@okaxis&am=...`) with one-tap scanning for GPay/PhonePe/Paytm.
- **Card / EDC**: EDC machine authorization reference ID tracking.
- **Split Payment**: Split cash and UPI/Card amounts with automated sum balance validation.

---

## 6. Live Google Sheets Billing Sync (22 Columns)

Every POS bill is immediately and idempotently synchronized to the current month's Google Sheet (`<Year>-<Month>`):

```
1. BILL NUMBER          8. ORDER TYPE         15. GST TAXES (5%)
2. DATE                 9. TABLE NUMBER       16. DELIVERY FEE
3. TIME                10. ITEMS SUMMARY      17. FINAL AMOUNT
4. FRANCHISE           11. ITEM QUANTITY      18. PAYMENT METHOD
5. BRANCH              12. SUBTOTAL           19. PAYMENT STATUS
6. CUSTOMER NAME       13. DISCOUNT AMOUNT    20. ORDER STATUS
7. CUSTOMER PHONE      14. COUPON CODE        21. CASHIER
                                              22. POS TERMINAL
```
