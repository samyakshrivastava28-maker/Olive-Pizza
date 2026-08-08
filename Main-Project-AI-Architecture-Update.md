# Olive Pizza Main Project — AI Architecture Final Update

## Objective

Update the Main Project architecture so it becomes ONLY the business platform.
The Main Project must NEVER become another AI project.
Olive Pizza AI is the ONLY AI platform.

---

# IMPORTANT

DO NOT break any existing working features.
This update is an architecture refactor.
The owner should not notice any missing functionality.

---

# Keep Existing Business Features

DO NOT remove these pages or their UI. Keep them exactly as they are.

- Product Image Generator
- Product Prompt Enhancer
- Product Description Generator
- Combo Image Generator
- Combo Prompt Enhancer
- Email Generator
- Advertisement Generator
- SDUI AI Designer
- Google Stitch Integration
- Prompt Enhancer
- AI Preview
- Image Preview

The only change is:
Instead of local AI logic, they call Olive Pizza AI through OlivePizzaAISDK.
Their UI must remain unchanged.

---

# Remove ONLY Duplicate AI

Remove ONLY
- Internal chatbot
- Internal conversational AI
- Internal RAG
- Internal LLM router
- Internal AI memory
- Internal prompt engine

Do NOT remove business features.

---

# Main Project Responsibilities

Main Project owns:
- Authentication
- Orders
- Payments
- Coupons
- Products
- Categories
- Delivery
- Notifications
- Firestore
- Knowledge Generator
- Embeddings
- Pinecone
- Cloudflare R2 Upload
- Cloudinary Upload
- Reports
- Google Sheets
- Monthly Reports
- PDF Generation
- SDUI Renderer
- Website Manager
- Owner Dashboard
- Developer Dashboard
- Business Logic

Everything else belongs to Olive Pizza AI.

---

# AI Calls

Whenever these pages require AI ↓
Call OlivePizzaAISDK ↓
Olive Pizza AI ↓
Return result

No local LLM.

---

# Cloudflare R2

Knowledge flow:
Firestore ↓
Knowledge Generator ↓
Embeddings ↓
Pinecone ↓
Knowledge JSON ↓
Upload to Cloudflare R2

Main Project NEVER downloads knowledge.

---

# SDUI

Owner ↓
Prompt ↓
Olive Pizza AI ↓
Google Stitch ↓
Preview ↓
Owner Approves ↓
Main Backend publishes ↓
Firestore updates ↓
Homepage changes

Main Project only publishes.

---

# Verification

Verify:
✔ No duplicate chatbot exists.
✔ Existing Product AI still works.
✔ Existing Combo AI still works.
✔ Existing Email AI still works.
✔ Existing Advertisement AI still works.
✔ Existing SDUI Designer still works.
✔ Existing Prompt Enhancers still work.
✔ Google Stitch still works.
✔ Only conversational AI moved.

---

# IMPORTANT

If confused STOP.
Open browser.
Open ChatGPT.
Continue discussion.
Never create another AI system.
