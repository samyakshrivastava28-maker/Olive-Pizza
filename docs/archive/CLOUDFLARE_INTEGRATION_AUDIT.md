# ☁️ Olive Pizza Ecosystem — Cloudflare Production Integration Audit
**Audit Date:** August 2026  
**Auditor:** Antigravity Master Infrastructure Agent  
**Status:** Audit Complete — Phase 1 Architecture Verification  

---

## 1. Current Infrastructure Discovery & Topology

An in-depth inspection of the repositories, DNS records, hosting configurations, and environment files reveals the following active infrastructure:

| Component | Current Hosting / Provider | Current Origin / Target | Target Production Domain | Cloudflare Edge Role |
|---|---|---|---|---|
| **Customer Web & PWA** | Vercel | `olive-pizza.vercel.app` (cname.vercel-dns.com) | `olivepizza.in` & `www.olivepizza.in` | CDN Caching, DDoS, Turnstile, Web Analytics |
| **Canonical Central Backend** | Render Web Service / Cloudflare Tunnel | `olivepizza-owner.onrender.com` (Port 5175/10000) | `api.olivepizza.in` | SSL Termination, WAF, Rate Limiting, Tunnel, Turnstile Verifier |
| **Realtime WebSocket Server** | Node.js ws on Canonical Backend | `olivepizza-owner.onrender.com/ws` | `wss://api.olivepizza.in/ws` | Edge WebSocket Proxy, WSS, Zero Cache |
| **Owner Admin Console** | Vercel / Local Host | `olivepizza-owner.vercel.app` | `owner.olivepizza.in` | Private App Protection, Noindex, Strict SSL |
| **Franchise Management** | Vercel / Local Host | `olive-pizza-franchise.vercel.app` | `franchise.olivepizza.in` | Private App Protection, Noindex, Strict SSL |
| **Restaurant Operations** | Vercel / Local Host | `olive-pizza-restaurant.vercel.app` | `manager.olivepizza.in` | Private App Protection, Noindex, Strict SSL |
| **Delivery Partner Web/PWA**| Vercel / Local Host | `olive-pizza-delivery.vercel.app` | `delivery.olivepizza.in` | Private App Protection, Noindex, Strict SSL |
| **POS Billing Terminal** | Electron / Vercel Web | `olive-pizza-pos.vercel.app` | `pos.olivepizza.in` | Private Counter App, Noindex, Strict SSL |
| **Media & Static Storage** | Cloudflare R2 Object Storage | `olive-pizza-r2` bucket (`46c5dd8c33b4dbfb4bc8e5c74e73a93c`) | `media.olivepizza.in` | High-Speed CDN Asset Delivery |
| **Live Navigation Telemetry** | Supabase PostgreSQL | `aws-1-ap-south-1.pooler.supabase.com:6543` | `https://tdjrkqmhdynbaciguyvr.supabase.co` | Untouched Telemetry Store (5m retention) |
| **Primary Business DB** | Google Cloud Firestore | `olive-pizza-08.firebaseio.com` | Native Google Cloud SDK | Untouched Business Document Store |
| **Standard Relational DB** | Standard PostgreSQL Pool | `aws-1-ap-south-1.pooler.supabase.com:6543` | Backend-only Connection Pool | Untouched Transactional Ledger |

---

## 2. Planned Cloudflare DNS Architecture

All hostnames for the `olivepizza.in` zone mapped with Proxied status (`Orange Cloud` ☁️):

```ini
;; Zone: olivepizza.in (Cloudflare Managed DNS)
;; Apex & Public Web
olivepizza.in.           IN CNAME cname.vercel-dns.com.          ; Proxied (Orange Cloud)
www.olivepizza.in.       IN CNAME cname.vercel-dns.com.          ; Proxied (Orange Cloud)

;; Canonical API & WebSocket Gateway
api.olivepizza.in.       IN CNAME olivepizza-owner.onrender.com. ; Proxied (Orange Cloud) - WebSockets Enabled

;; Cloudflare R2 Object Storage CDN
media.olivepizza.in.     IN CNAME custom-domain.r2.cloudflarestorage.com. ; Proxied (Orange Cloud)

;; Private Management & Operational Applications
owner.olivepizza.in.     IN CNAME cname.vercel-dns.com.          ; Proxied (Orange Cloud)
franchise.olivepizza.in. IN CNAME cname.vercel-dns.com.          ; Proxied (Orange Cloud)
manager.olivepizza.in.   IN CNAME cname.vercel-dns.com.          ; Proxied (Orange Cloud)
delivery.olivepizza.in.  IN CNAME cname.vercel-dns.com.          ; Proxied (Orange Cloud)
pos.olivepizza.in.       IN CNAME cname.vercel-dns.com.          ; Proxied (Orange Cloud)
```

---

## 3. SSL/TLS & Edge Security Configuration

1. **Encryption Mode**: **Full (Strict)** — Requires valid SSL certificates on origins (Vercel & Render automatically provision Let's Encrypt certificates).
2. **Edge Certificates**:
   - Minimum TLS Version: `TLS 1.2` (TLS 1.3 enabled).
   - Universal SSL: Active.
   - Always Use HTTPS: `ON` (HTTP 301 Redirect to HTTPS).
   - Automatic HTTPS Rewrites: `ON`.
   - Opportunistic Encryption: `ON`.
3. **HTTP Strict Transport Security (HSTS)**:
   - `max-age=31536000; includeSubDomains; preload`

---

## 4. Edge Caching & CDN Policy (Zero Stale Business Data)

| Path Pattern | Cache Level | Edge TTL | Browser TTL | Rationale |
|---|---|---|---|---|
| `olivepizza.in/assets/*` | Cache Everything | 7 days | 1 day | Immutable Vite hashed bundles (`.js`, `.css`, fonts) |
| `olivepizza.in/*.webp`, `*.svg` | Cache Everything | 30 days | 7 days | Static branding images, icons, illustrations |
| `media.olivepizza.in/*` | Cache Everything | 30 days | 7 days | Cloudflare R2 menu media & PDF report downloads |
| `api.olivepizza.in/api/*` | **Bypass Cache** | 0s | 0s (`no-store`) | Dynamic orders, cart, payments, auth, POS, kitchen |
| `api.olivepizza.in/ws` | **Bypass Cache** | 0s | 0s | Live WebSocket streams for rider GPS & order alarms |
| `owner.*`, `franchise.*`, `pos.*` | **Private / Bypass** | 0s | 0s (`private, no-store`) | Protected operational applications |

---

## 5. Web Application Firewall (WAF) & DDoS Protection Rules

### 5.1 Cloudflare Managed Ruleset
- OWASP Core Ruleset enabled at medium sensitivity.
- Cloudflare Managed Ruleset enabled (protects against SQLi, XSS, RCE).

### 5.2 Custom Firewall Rules
1. **Rule 1: Payment Webhook Bypass**:
   - `(http.request.uri.path contains "/api/payment/webhook")` $\rightarrow$ **Action: Bypass Bot Management / JS Challenge** (ensures Razorpay, PhonePe, Cashfree callbacks are never blocked by challenges).
2. **Rule 2: Source Code & Secret Leak Block**:
   - `(http.request.uri.path contains ".env" or http.request.uri.path contains ".git" or http.request.uri.path contains ".ts" or http.request.uri.path contains ".tsx" or http.request.uri.path contains ".map")` $\rightarrow$ **Action: Block (403 Forbidden)**.
3. **Rule 3: Private Subdomain Geo & Security Shield**:
   - `(http.host in {"owner.olivepizza.in", "pos.olivepizza.in", "manager.olivepizza.in", "franchise.olivepizza.in"}) and (cf.threat_score gt 15)` $\rightarrow$ **Action: Managed Challenge**.

---

## 6. Edge Rate Limiting Policies

| Rule Target | Path / Endpoint | Threshold | Window | Action |
|---|---|---|---|---|
| **OTP / SMS Rate Limit** | `/api/auth/otp/*`, `/api/auth/verify-phone` | 5 requests | 10 mins | Block (HTTP 429) |
| **Auth / Login Limit** | `/api/auth/login`, `/api/auth/register` | 15 requests | 15 mins | Managed Challenge |
| **Order Placement Limit**| `/api/orders`, `/api/payment/create-order` | 20 requests | 15 mins | Block (HTTP 429) |
| **Public Menu / Search** | `/api/menu/*`, `/api/products/*` | 300 requests | 15 mins | Log / Slow down |
| **Live Navigation / GPS**| `/api/delivery/location/*`, `/ws` | **EXEMPT** | N/A | High-throughput bypass |

---

## 7. Cloudflare Turnstile Integration Strategy

- **Placement**:
  1. Customer signup / new account creation.
  2. Public phone OTP requests (mitigates SMS toll fraud / bombing).
  3. Contact & support inquiry submissions.
- **Verification Architecture**:
  - Frontend renders `<Turnstile sitekey="..." onVerify={token => setTurnstileToken(token)} />`.
  - Backend verifies token via `https://challenges.cloudflare.com/turnstile/v0/siteverify` using `CLOUDFLARE_TURNSTILE_SECRET_KEY`.
  - Capacitor Mobile Apps send a bypass header or verified Firebase Auth JWT, maintaining frictionless native app UX.

---

## 8. WebSocket & Live Navigation Compatibility

- Cloudflare Network Settings: **WebSockets: ON** enabled.
- Path `/ws` on `api.olivepizza.in` upgrades cleanly to `wss://api.olivepizza.in/ws`.
- Supabase live GPS broadcast pipeline remains 100% operational.
- 5-minute automated telemetry retention runs unaffected on the backend.

---

## 9. Rollback Plan

If Cloudflare DNS or Edge encounters an unexpected disruption:
1. **Instant DNS Bypass**: Change DNS record from Proxied (Orange Cloud ☁️) to DNS-Only (Grey Cloud ☁️), routing traffic directly to Vercel/Render origins within 60 seconds (TTL: 120s).
2. **Direct API Fallback**: Mobile apps and frontend have baked-in fallback to `https://olivepizza-owner.onrender.com` in `config.ts` if `api.olivepizza.in` fails.
