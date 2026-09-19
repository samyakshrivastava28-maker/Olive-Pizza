# OLIVE PIZZA — DPDP PRIVACY, DATA RIGHTS & SECURITY ARCHITECTURE

**System Version:** 1.0.0  
**Effective Date:** September 19, 2026  
**Document Classification:** Technical Architecture & Governance Framework  
**Target Applications:** Customer Web/App, Owner Console, Restaurant Manager, POS, Delivery App, Franchise Console  

---

## 1. Executive Summary & Technical Readiness Scope

Olive Pizza operates a multi-application quick-service restaurant (QSR) food delivery and retail ecosystem across India. Under India's **Digital Personal Data Protection Act, 2023 (DPDP Act)**, Olive Pizza functions as a **Data Fiduciary**, determining the purpose and means of processing digital personal data of its customers, delivery partners, and franchise operators.

### Technical Scope vs. Legal Disclaimer
This document and its underlying implementation establish the **technical infrastructure and administrative controls** necessary for DPDP readiness. 
> **Engineering Scope vs Legal Counsel**: This system provides the software capabilities required to comply with the DPDP Act (notice delivery, consent capture, withdrawal hooks, data export, data correction, erasure workflows, grievance ticketing, processor inventory, and audit logging). The final legal texts, Terms of Service, and statutory DPO appointments require validation by qualified Indian legal counsel.

---

## 2. Personal Data Inventory & Classification Matrix

| Data Element | Category | Purpose of Collection | Lawful Basis | Storage System | Retention Period |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Full Name** | Identity | Account creation, order dispatch, invoice generation | Contractual / Essential | Firestore `users` | Active account lifetime |
| **Mobile Number** | Contact | Primary authentication identifier, delivery contact, transactional SMS | Contractual / Essential | Firebase Auth / Firestore `users` & `customer_identities` | Active account lifetime |
| **Email Address** | Contact | Order receipt delivery, account security notices, promotional updates | Contractual / Consent (Marketing) | Firebase Auth / Firestore `users` | Active account lifetime |
| **Delivery Address & Coordinates** | Spatial | Geocoding, store routing, delivery dispatch | Contractual / Essential | Firestore `users.savedAddresses`, `orders.deliveryAddress` | Active account lifetime; anonymized on deletion |
| **Live GPS Breadcrumbs** | Telemetry | Live rider delivery tracking | Contractual / Service | Firestore `delivery_tracking` / `rider_locations` | **5 minutes** (realtime TTL purged) |
| **Order History & Invoices** | Financial | Billing, financial auditing, tax compliance | Legal Obligation (Section 36, CGST Act) | Firestore `orders`, Cloudflare R2 PDF / Google Sheets | **8 Years** (statutory GST requirement) |
| **Payment Reference / Txn ID** | Transactional | Razorpay payment confirmation & dispute reconciliation | Contractual / Legal | Razorpay & Firestore `orders.payment` | **8 Years** (No raw card data stored) |
| **Device Tokens (FCM)** | Communication | Push alerts for order milestones & marketing | Contractual / Consent (Marketing) | Firestore `users.fcmTokens` | Session lifetime (cleared on logout) |
| **Consent Artifacts** | Regulatory | Recording affirmative consent state & withdrawal history | Legal Obligation (DPDP) | Firestore `user_consents`, `consent_audit_logs` | Permanent / Immutable audit record |

---

## 3. Lawful Grounds for Processing

Olive Pizza categorizes personal data processing into two strictly separated channels:

### A. Essential Service Processing (Contractual & Statutory Fulfillment)
Processing without which food preparation, payment handling, legal invoicing, and physical delivery cannot be completed:
- Phone verification via OTP for account security.
- Order details routing to POS and Kitchen Display System (KDS).
- Sharing customer address and phone number with the assigned delivery partner solely during active transit.
- Invoicing and retention of GST-compliant financial ledgers.
*Users cannot opt out of essential service processing while maintaining an active transaction.*

### B. Optional Consent-Based Processing (Consent-Driven)
Processing that requires distinct, freely given, specific, informed, and unambiguous affirmative consent:
1. **Marketing & Promotional Communications**: SMS, WhatsApp, Email, and Push Notifications regarding discounts and offers.
2. **Behavioral Analytics & Recommendations**: Tracking browsing patterns and past order tastes to personalize the digital menu.

---

## 4. Notice & Multilingual Strategy

Under Section 5 of the DPDP Act, notice must accompany or precede any request for consent.

- **Dynamic Notice Delivery**: The system renders notices using a version-controlled database schema (`privacy_policy_versions`).
- **Notice Contents**:
  1. Specific personal data categories collected.
  2. The precise purpose of processing.
  3. The manner of exercising Data Principal rights (correction, erasure, grievance).
  4. Grievance Officer identity and escalation path.
- **Multilingual Support**: All notices and consent prompts are structured to deliver localized texts in **English** and **Hindi** (with architecture extensible to the 22 Eighth Schedule Indian languages).
- **Version Tracking**: When policy versions are incremented (`v1.0.0` -> `v1.1.0`), the system detects notice changes and prompts users on their next interactive session.

---

## 5. Consent Architecture & Lifecycle

### Key Technical Mechanisms
1. **Backend Authoritative**: Consent state cannot be fabricated on client devices. All mutations validate the authenticated Firebase UID via `PrivacyService.recordUserConsent`.
2. **Granular Withdrawal**: Withdrawing `MARKETING_PROMOTIONS` or `ANALYTICS` takes effect immediately in `NotificationQueueService`.
3. **Audit Trail**: Every grant, update, or withdrawal writes an append-only log in `consent_audit_logs` storing IP address, User-Agent, timestamp, and previous vs new consent flags.

---

## 6. Data Principal Rights Implementation

### A. Right to Access & Data Portability
- **Endpoint**: `POST /privacy/data-access-request`
- **Output**: Machine-readable, sanitized JSON package (`Olive_Pizza_Data_Export_<uid>.json`).
- **Sanitization Rule**: Excludes salted password hashes, internal administrative claims, security logs, or internal proprietary flags.

### B. Right to Correction & Updating
- **Endpoint**: `POST /privacy/correction-request`
- **Allowed Fields**: Whitelisted modification of `name`, `phone`, `email`, and `savedAddresses`.
- **Security Check**: Attempts to alter system privileges (`role`, `franchiseId`, `isAdmin`, `customClaims`) are rejected immediately with a security alert.

### C. Right to Erasure & Grace Period Workflow
1. **Initiation**: Customer submits request via `POST /privacy/deletion-request`.
2. **Status**: Marked as `PENDING` with a **30-day statutory cooling-off/grace period**.
3. **Cancellation Option**: Customer may log in and cancel deletion within 30 days.
4. **Execution (`executeAccountErasure`)**:
   - **Firestore Profile**: Personal address, phone, email, and tokens wiped from `users/{uid}`.
   - **Financial Invoices**: Order records are **not destroyed** (preventing tax fraud under CGST Act). Instead, customer identifying fields on historical orders are replaced with:
     - Name: `"Anonymized Customer"`
     - Phone: `"+91-0000000000"`
     - Delivery Address: `"Redacted for DPDP Compliance"`
   - **Authentication Record**: Firebase Auth user account disabled/deleted.

### D. Right to Grievance Redressal
- **Statutory Window**: Acknowledgment within 48 hours; resolution within 30 days.
- **Ticketing**: Tickets generated as `GRV-YYYYMMDD-XXXX`.
- **Tracking**: Customers track resolution notes directly in their Privacy Center.

---

## 7. Children's Data & Age Verification Policy

Under Section 9 of the DPDP Act, processing data of minors requires verifiable parental consent and forbids harmful profiling or targeted ads.

1. **Age Declaration**: During onboarding and inside the Privacy Center, a clear self-declaration confirms the user is 18 years or older.
2. **Minors Guidance**: Notice explicitly states minors under 18 may only use Olive Pizza under the supervision and affirmative consent of a parent or legal guardian.
3. **No Behavioral Tracking on Minors**: Olive Pizza operates no targeted behavioral advertising algorithms or tracking pixels directed at minors.

---

## 8. Data Retention, Anonymization & Destruction Policies

- **GPS Telemetry**: Rider coordinates are retained only for the duration of the active delivery trip plus 5 minutes for handover verification, then flushed.
- **Abandoned Carts**: `user_carts` older than 30 days are automatically scrubbed.
- **Financial Balances**: Retained for 8 years in strict accordance with Section 36 of the Central Goods and Services Tax (CGST) Act, 2017.

---

## 9. Data Processors & Third-Party Sharing Registry

Olive Pizza engages the following sub-processors under contractual data protection terms:

| Sub-Processor | Role / Function | Data Shared | Transfer Mechanism | Security Controls |
| :--- | :--- | :--- | :--- | :--- |
| **Google Cloud / Firebase** | Cloud Database & Hosting | Identity, Profile, Orders | Regional (India `asia-south1`) | ISO 27001, SOC 2, TLS 1.3, At-Rest Encryption |
| **Supabase (PostgreSQL)** | Operational Data Cache | Aggregated business metrics | Cloud Infrastructure | Encrypted connection pooling |
| **Fast2SMS** | SMS Gateway | Mobile Number, Transactional OTP | HTTPS REST API | Transmits transactional OTP only; zero retention contract |
| **Razorpay** | Payment Gateway | Amount, Order ID, Contact | Direct Client SDK / Server Webhook | PCI-DSS Level 1 compliant tokenization |
| **Cloudinary** | Image Assets CDN | Menu items & promo graphics | HTTPS Storage | Public assets only; no PII stored |
| **Cloudflare R2** | Object Storage | Financial reports, data exports | Encrypted S3-compatible API | TLS 1.3, Private signed URLs |

---

## 10. Security Safeguards & Encryption Standards

- **In-Transit**: Mandatory HTTPS / TLS 1.3 encryption across all client-server interactions.
- **At-Rest**: Google Cloud / Firestore default AES-256 block encryption.
- **Access Control (RBAC)**: Strict separation of privileges. POS operators and Restaurant Managers can only view customer details of active orders routed to their specific branch/franchise.
- **Firestore Security Rules**: Direct client writes to sensitive governance collections (`privacy_policy_versions`, `privacy_retention_policies`, `privacy_processors`, `security_incidents`, `privacy_audit_logs`, `deletion_requests`) are denied; mutations are permitted exclusively via the backend Admin SDK.

---

## 11. Security Incident & Breach Notification Management Procedure

- **No Automated Spurious Alerts**: In accordance with enterprise governance principles, system incidents do not trigger unreviewed blast notifications to avoid panic or false alarms.
- **Investigation Workflow**: Platform security leads log incident timelines, affected UID counts, breached vector, and remediation actions in the Owner Console.
- **Escalation Path**: High/Critical breaches undergo internal assessment by legal/management before submitting statutory notices to the Data Protection Board of India (DPBI) and notifying affected users.

---

## 12. Significant Data Fiduciary (SDF) Preparedness Analysis

The Central Government may designate certain fiduciaries as Significant Data Fiduciaries based on volume, sensitivity, risk of harm, or national sovereignty.

- **Current Status**: **Standard Data Fiduciary**. Olive Pizza's order volumes and data sensitivity profiles do not currently cross SDF statutory thresholds.
- **Preparedness Measures Implemented**:
  1. **Data Protection Officer (DPO)**: Architecture provides designated contact fields (`grievanceOfficer`) across all customer touchpoints.
  2. **Audit Logging**: Comprehensive, append-only logs for consents, grievances, and administrative data accesses.
  3. **Data Protection Impact Assessment (DPIA) Readiness**: Structured data categorization enables rapid DPIA generation upon notification by regulatory authorities.

---

## 13. Admin & Governance Playbook

The Owner Console (`/privacy-governance`) gives authorized administrators full operational oversight:

1. **Grievance Resolution**:
   - Filter tickets by status (`SUBMITTED`, `IN_REVIEW`, `RESOLVED`, `REJECTED`).
   - Read customer grievance details and statutory SLA countdown timer.
   - Post official resolution notes and update status; customer's view updates in realtime.
2. **Account Erasure Auditing**:
   - Review pending deletion requests.
   - Inspect scheduled execution dates (30 days post-request).
   - Manually trigger `execute-erasure` after verifying no active disputes or chargebacks exist.
3. **Policy Version Management**:
   - Draft new privacy policy versions with detailed change notes.
   - Publish new policy version to automatically trigger client re-acceptance.
4. **Processor Inventory Review**:
   - Maintain third-party vendor statuses, purposes, and jurisdiction details.

---

## 14. Future Technical Roadmap for DPDP Full Enforcement

1. **Consent Manager Integration**: Support pluggable interoperability with Indian licensed Consent Managers once registered by the Data Protection Board of India.
2. **Digital Locker Integration**: Direct export of financial invoices and order receipts to government DigiLocker instances.
3. **Automated Cron Jobs for Data Retention**: Scheduled background jobs to automatically execute account erasures on the 31st day following pending request creation.
4. **Offline Kiosk Mode**: On-screen QR code privacy notices for in-store touch-screen self-ordering kiosks.

---

*Report compiled by Olive Pizza Architecture & Engineering Team.*
