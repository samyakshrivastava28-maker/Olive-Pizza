# 🚀 Olive Pizza Ecosystem — Production Deployment & Runtime Guide

## 1. Multi-Surface Runtime Port Allocation

| Surface Name | Directory / Project | Local Dev Port | Production Build Command | Dev Command |
|---|---|---|---|---|
| **Canonical Backend** | `olive-pizza/backend` | `5000` | `npm run build` | `npm run dev` |
| **Customer Web & App** | `olive-pizza/frontend` | `5173` | `npm run build` | `npm run dev -- --port 5173` |
| **Owner Platform & Web** | `olive-pizza-owner` | `5174` | `npm run build` | `npm run dev -- --port 5174` |
| **Restaurant Manager** | `olive-pizza-restaurant-management` | `5176` | `npm run build` | `npm run dev -- --port 5176` |
| **Delivery Partner App** | `olive-pizza-delivery` | `5177` | `npm run build` | `npm run dev -- --port 5177` |
| **POS Billing Software** | `olive-pizza-pos` | `5178` | `npm run build` | `npm run dev -- --port 5178` |

---

## 2. Server Environment Variables (`backend/.env`)

```ini
# Server Port & Core
PORT=5000
NODE_ENV=production
FRONTEND_URL=http://localhost:5173

# Firebase Service Account Credentials (Server-side ONLY)
FIREBASE_PROJECT_ID=olive-pizza-08
FIREBASE_SERVICE_ACCOUNT_BASE64=<BASE64_ENCODED_JSON>
# Or individual credentials:
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@olive-pizza-08.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Supabase PostgreSQL (Port 6543 pooler)
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# Google Cloud & Sheets API
GOOGLE_SERVICE_ACCOUNT_BASE64=<BASE64_ENCODED_JSON>
GOOGLE_SHEET_SPREADSHEET_ID=1_example_google_sheet_id_here

# Cloudflare R2 Object Storage
CLOUDFLARE_R2_ACCOUNT_ID=xxx
CLOUDFLARE_R2_ACCESS_KEY_ID=xxx
CLOUDFLARE_R2_SECRET_ACCESS_KEY=xxx
CLOUDFLARE_R2_BUCKET_NAME=olive-pizza-r2
CLOUDFLARE_R2_PUBLIC_DOMAIN=https://media.olivepizza.in

# Cloudinary Media CDN
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# SMTP & Transactional Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=olivepizzarjn@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx
OWNER_EMAIL=olivepizzarjn@gmail.com

# NVIDIA NIM / DeepSeek AI
NVIDIA_API_KEY=nvapi-xxxx
DEEPSEEK_API_KEY=sk-xxxx
```

---

## 3. Strict Security & Secret Isolation Rules

1. **Zero Secrets on Client**:
   - Secrets (`FIREBASE_SERVICE_ACCOUNT_BASE64`, `DATABASE_URL`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `NVIDIA_API_KEY`, `SMTP_PASS`) must strictly remain in `backend/.env`.
   - Never expose secrets in client-side Vite bundles (`.env.production`), Android APK configs, or public repositories.
2. **Authorized Master Accounts**:
   - Master account access is permanently restricted to `webhub2811@gmail.com` and `olivepizzarjn@gmail.com`.
3. **Cross-Branch Protection**:
   - Enforced by server-side `requireBranchScope()` middleware.
