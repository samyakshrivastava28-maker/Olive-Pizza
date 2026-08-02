import OpenAI from 'openai';
import dotenv from 'dotenv';
import cloudinary from '../config/cloudinary.js';
import { resolveProductContext } from './ai/productContextResolver.js';
import { detectLanguage, getMultilingualPromptInstruction } from './ai/languageDetector.js';
import { AI_TOOLS, TOOL_SCHEMAS_OPENAI } from './ai/toolSchemas.js';
import { conversationMemory } from './ai/conversationMemory.js';
import { executeBackendTool } from './ai/toolExecutor.js';
import { catalogGuard } from './ai/CatalogGuard.js';

dotenv.config();

// ── API key helpers ───────────────────────────────────────────────────────────
function getKey(name: string): string {
  const assistantKey = `ASSISTANT_${name}`;
  return process.env[assistantKey] || process.env[name] || '';
}
function isValidKey(key: string): boolean { return typeof key === 'string' && key.trim().length > 10; }

// ── AI Provider Health Stats (exported for /api/ai/kb-status) ────────────────
export const aiProviderStats = {
  nvidia:     { ok: false, lastUsed: 0, lastError: '', attempts: 0, successes: 0 },
  openrouter: { ok: false, lastUsed: 0, lastError: '', attempts: 0, successes: 0 },
  gemini:     { ok: false, lastUsed: 0, lastError: '', attempts: 0, successes: 0 },
  activeProvider: 'none' as string,
  totalRequests: 0,
  totalFailovers: 0,
  avgResponseMs: 0,
};

// ── Lazy client getters — never crash on invalid keys ─────────────────────────
let _nvidiaClient: OpenAI | null = null;
let _openRouterClient: OpenAI | null = null;
let _geminiClient: OpenAI | null = null;

function getNvidiaClient(): OpenAI | null {
  const key = getKey('NVIDIA_API_KEY');
  if (!isValidKey(key)) return null;
  if (!_nvidiaClient) {
    _nvidiaClient = new OpenAI({ apiKey: key, baseURL: 'https://integrate.api.nvidia.com/v1', timeout: 12000, maxRetries: 0 });
    console.log('[AI] NVIDIA client initialized');
  }
  return _nvidiaClient;
}

function getOpenRouterClient(): OpenAI | null {
  const key = getKey('OPENROUTER_API_KEY');
  if (!isValidKey(key)) return null;
  if (!_openRouterClient) {
    _openRouterClient = new OpenAI({
      apiKey: key,
      baseURL: 'https://openrouter.ai/api/v1',
      timeout: 12000,
      maxRetries: 0,
      defaultHeaders: { 'HTTP-Referer': 'https://olivepizza.app', 'X-Title': 'Olive Pizza AI Assistant' },
    });
    console.log('[AI] OpenRouter client initialized');
  }
  return _openRouterClient;
}

function getGeminiClient(): OpenAI | null {
  const key = getKey('GEMINI_API_KEY');
  if (!isValidKey(key)) return null;
  if (!_geminiClient) {
    _geminiClient = new OpenAI({
      apiKey: key,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      timeout: 15000,
      maxRetries: 0,
    });
    console.log('[AI] Gemini client initialized');
  }
  return _geminiClient;
}

// Log provider status at startup
setTimeout(() => {
  const nv = isValidKey(getKey('NVIDIA_API_KEY'));
  const or = isValidKey(getKey('OPENROUTER_API_KEY'));
  const gm = isValidKey(getKey('GEMINI_API_KEY'));
  console.log(`[AI] Provider keys configured: NVIDIA=${nv ? '✅' : '❌'}  OpenRouter=${or ? '✅' : '❌'}  Gemini=${gm ? '✅' : '❌'}`);
  if (!nv && !or && !gm) console.warn('[AI] ⚠️  No AI provider keys configured. All chat will use Local KB + Offline templates.');
}, 1000);

// ── Bad Model Blacklist (in-memory cache for 10 mins on 404/410/not-found) ─────
const badModelBlacklist = new Map<string, number>();

function isModelBlacklisted(modelKey: string): boolean {
  const expiry = badModelBlacklist.get(modelKey);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    badModelBlacklist.delete(modelKey);
    return false;
  }
  return true;
}

function blacklistModel(modelKey: string, durationMs: number = 600000) {
  badModelBlacklist.set(modelKey, Date.now() + durationMs);
}

// ── Model chain (priority order for general tasks) ────────────────────────────
// ── Production Model Router Chain ──────────────────────────────────────────────
// Primary: NVIDIA NIM (DeepSeek V4 Flash default -> GLM 5.2 -> Nemotron 3 Super -> Kimi 2.6)
// Fallback: OpenRouter (Kimi 2.7 -> Gemma 4 31B -> GPT OSS 120B -> Ling 3.0 Flash -> Gemini 3.6 Flash -> Gemini 3.5 Flash Lite)
function getModelChain() {
  const chain: { client: OpenAI; model: string; name: string; providerKey: string }[] = [];
  const nvidia = getNvidiaClient();
  const or = getOpenRouterClient();

  // 1. PRIMARY TIER: NVIDIA NIM
  if (nvidia) {
    if (!isModelBlacklisted('nvidia:deepseek-ai/deepseek-v4-flash')) {
      chain.push({ client: nvidia, model: 'deepseek-ai/deepseek-v4-flash', name: 'DeepSeek V4 Flash (NVIDIA Primary Default)', providerKey: 'nvidia' });
    }
    if (!isModelBlacklisted('nvidia:z-ai/glm-5.2')) {
      chain.push({ client: nvidia, model: 'z-ai/glm-5.2', name: 'GLM 5.2 (NVIDIA)', providerKey: 'nvidia' });
    }
    if (!isModelBlacklisted('nvidia:nvidia/nemotron-3-super-120b-a12b')) {
      chain.push({ client: nvidia, model: 'nvidia/nemotron-3-super-120b-a12b', name: 'Nemotron 3 Super (NVIDIA)', providerKey: 'nvidia' });
    }
    if (!isModelBlacklisted('nvidia:moonshotai/kimi-k2.6')) {
      chain.push({ client: nvidia, model: 'moonshotai/kimi-k2.6', name: 'Kimi 2.6 (NVIDIA)', providerKey: 'nvidia' });
    }
  }

  // 2. SECONDARY TIER: OpenRouter Fallback Chain
  if (or) {
    if (!isModelBlacklisted('openrouter:moonshotai/kimi-2.7')) {
      chain.push({ client: or, model: 'moonshotai/kimi-2.7', name: 'Kimi 2.7 (OpenRouter)', providerKey: 'openrouter' });
    }
    if (!isModelBlacklisted('openrouter:google/gemma-4-31b-it')) {
      chain.push({ client: or, model: 'google/gemma-4-31b-it', name: 'Gemma 4 31B (OpenRouter)', providerKey: 'openrouter' });
    }
    if (!isModelBlacklisted('openrouter:openai/gpt-oss-120b')) {
      chain.push({ client: or, model: 'openai/gpt-oss-120b', name: 'GPT OSS 120B (OpenRouter)', providerKey: 'openrouter' });
    }
    if (!isModelBlacklisted('openrouter:inclusionai/ling-3.0-flash')) {
      chain.push({ client: or, model: 'inclusionai/ling-3.0-flash', name: 'Ling 3.0 Flash (OpenRouter)', providerKey: 'openrouter' });
    }
    if (!isModelBlacklisted('openrouter:google/gemini-3.6-flash')) {
      chain.push({ client: or, model: 'google/gemini-3.6-flash', name: 'Gemini 3.6 Flash (OpenRouter)', providerKey: 'openrouter' });
    }
    if (!isModelBlacklisted('openrouter:google/gemini-3.5-flash-lite')) {
      chain.push({ client: or, model: 'google/gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite (OpenRouter)', providerKey: 'openrouter' });
    }
  }

  return chain;
}

// Legacy MODEL_CHAIN for email/image/description — built once, lazily
let _MODEL_CHAIN: { client: OpenAI; model: string; name: string; providerKey: string }[] | null = null;
const MODEL_CHAIN_GETTER = () => {
  if (!_MODEL_CHAIN) _MODEL_CHAIN = getModelChain();
  return _MODEL_CHAIN;
};
// Allow non-lazy usage for existing functions (safe — clients are lazily initialized internally)
const MODEL_CHAIN = MODEL_CHAIN_GETTER();

// ── Fetch product details safely ────────────────────────────────────────────────
async function fetchProductContext(selectedProducts: string[]): Promise<string> {
  if (!selectedProducts || selectedProducts.length === 0) return '';
  try {
    const { adminDb } = await import('../config/firebase.js');
    if (!adminDb) return '';
    let context = '\nPRODUCTS TO INCLUDE:\n';
    for (const prodId of selectedProducts) {
      try {
        const prodSnap = await adminDb.collection('products').doc(prodId).get();
        if (prodSnap.exists) {
          const p = prodSnap.data()!;
          context += `- ${p.name}: ₹${p.price}. ${p.description || ''}\n`;
          if (p.imageUrl) context += `  Image URL: ${p.imageUrl}\n`;
        }
      } catch {}
    }
    return context;
  } catch (e) {
    console.warn('[AI] Could not fetch Firestore products:', (e as any).message);
    return '';
  }
}

// ── Generate email HTML via AI with fallback chain ────────────────────────────
export async function generateEmailTemplate(
  prompt: string,
  selectedProducts: string[],
  audienceType: string
) {
  try {
    const context = await fetchProductContext(selectedProducts);
    const systemPrompt = `You are a world-class Email Marketing AI for Olive Pizza — a premium pizza delivery brand.
Generate a beautiful, responsive, conversion-optimized HTML email body.

RULES (strictly follow these):
1. Return ONLY raw HTML starting with a <div> container. NO markdown fences (no \`\`\`html), NO <html>, NO <body> tags.
2. Use ONLY inline CSS styles.
3. Brand colors: primary orange #f97316, dark background #0B0F14, accent white.
4. Make it look premium, modern, and food-forward.
5. Keep text short and punchy — marketing, not an essay.
6. Include a clear CTA button linking to https://olivepizza.app/menu

TARGET AUDIENCE: ${audienceType || 'all customers'}
${context}
USER CAMPAIGN BRIEF: ${prompt}`;

    let lastError: Error | null = null;
    for (const config of MODEL_CHAIN) {
      try {
        console.log(`[AI Email] Trying ${config.name}...`);
        const response = await config.client.chat.completions.create({
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Generate the HTML email body now. Start directly with <div.' },
          ],
          temperature: 0.7,
          max_tokens: 4096,
        });

        let html = response.choices[0]?.message?.content || '';
        if (!html) throw new Error('Empty response from model');

        html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        if (!html.startsWith('<div') && !html.startsWith('<table')) {
          const divStart = html.indexOf('<div');
          if (divStart > -1) html = html.slice(divStart);
        }

        console.log(`[AI Email] ✅ Success with ${config.name} (${html.length} chars)`);
        return { success: true, html, usedModel: config.name };
      } catch (err: any) {
        console.warn(`[AI Email] ❌ ${config.name} failed: ${err.message}`);
        lastError = err;
      }
    }
    throw new Error(`All AI models exhausted. Last error: ${lastError?.message}`);
  } catch (error: any) {
    console.error('[AI Email] Fatal error:', error);
    return { success: false, error: error.message };
  }
}

// ── AI Chat for the customer-facing AI Assistant ──────────────────────────────
export async function generateChatReply(
  message: string,
  history: { role: string; content: string }[],
  frontendContext: any
): Promise<{
  success: boolean;
  reply?: string;
  action?: any;
  source?: string;
  error?: string;
  telemetry?: {
    llmLatencyMs: number;
    modelUsed: string;
    providerUsed: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };
}> {
  aiProviderStats.totalRequests++;
  const requestStart = Date.now();

  try {
    const kbContext = frontendContext?.kbContext || '';
    const cartItems = frontendContext?.cart?.items || [];
    const cartSummary = cartItems.length > 0
      ? `Cart (${cartItems.length} items): ${cartItems.map((i: any) => `${i.name} (qty: ${i.quantity}, ₹${i.price})`).join(', ')} | Subtotal: ₹${frontendContext.cart.total || 0}`
      : 'Cart is currently empty';
    const currentRoute = frontendContext?.route || '/';
    const checkoutStep = frontendContext?.checkoutStep || 'none';
    const activeModal = frontendContext?.activeModal || 'none';
    const selectedAddress = frontendContext?.selectedAddress || 'Not selected';
    const paymentMode = frontendContext?.paymentMode || 'Not selected';
    const activeOrder = frontendContext?.activeOrder ? JSON.stringify(frontendContext.activeOrder) : 'No active order';
    const userRole = frontendContext?.role || 'guest';
    const isAuth = frontendContext?.isAuthenticated ?? false;
    const livePageContext = frontendContext?.livePageContext || '';
    const pageHint = frontendContext?.pageHint || '';
    const visibleProducts = frontendContext?.visibleProducts || [];
    const activeSearchQuery = frontendContext?.activeSearchQuery || '';

    // ── WORKSTREAM 1: Strict Product Context Resolution ──────────────────────
    const { strictPromptBlock } = await resolveProductContext(message);

    // ── WORKSTREAM 3: Multilingual Detection & Instructions ──────────────────
    const detectedLang = detectLanguage(message);
    const langInstruction = getMultilingualPromptInstruction(detectedLang);

    const systemPrompt = `You are Olive AI, the premium 24/7 artisan pizza concierge for Olive Pizza (Rajnandgaon, Chhattisgarh). You are polite, food-passionate, clear, helpful, and grounded.

== MULTILINGUAL RULES ==
${langInstruction}

== 100% PURE VEGETARIAN RESTAURANT POLICY ==
- Olive Pizza is a 100% PURE VEGETARIAN restaurant 🟢!
- We serve ONLY 100% Pure Veg pizzas, garlic breads, sides, desserts, and beverages.
- We DO NOT serve any Non-Veg food (No Chicken, Meat, Mutton, Eggs, or Seafood).
- If a user asks for non-veg options (e.g., "Do you have chicken pizza?", "Show non-veg items"), politely inform them in the detected language.

== ROLE-BASED PERMISSIONS ==
User Role: ${userRole.toUpperCase()} (${isAuth ? 'Authenticated' : 'Guest'})
- Guest: Can search menu, view deals, store info, FAQs, restaurant policies.
- Customer: Can modify cart, checkout, apply coupons, track active orders, repeat past orders.
- Owner/Admin: Can view business analytics & reports.

== LIVE PAGE CONTEXT (What the customer currently sees) ==
${livePageContext || `Route: ${currentRoute} | Checkout Step: ${checkoutStep} | Modal: ${activeModal}`}
${visibleProducts.length > 0 ? `Products visible on page: ${(visibleProducts as string[]).join(', ')}` : ''}
${activeSearchQuery ? `Customer searched for: "${activeSearchQuery}"` : ''}
${pageHint ? `Page hint: ${pageHint}` : ''}

== LIVE CART STATE ==
${cartSummary}
Delivery Address: ${selectedAddress}
Payment Mode: ${paymentMode}

== STEP-BY-STEP ORDER PLACEMENT GUIDE ==
When a customer asks to order or needs help placing an order, guide them step by step:
1. BROWSE → Ask what they'd like (pizza, sides, drinks, combo).
2. CUSTOMISE → Ask size (Small 7", Medium 10", Large 12"), crust (Classic/Cheese Burst/Thin/Pan), extra toppings.
3. ADD TO CART → Confirm, then emit ACTION using ONLY real product data from the knowledge base.
4. COUPON → Offer to apply an active coupon from the knowledge base.
5. CHECKOUT → Guide to /checkout. Must be logged in.
6. ADDRESS → Confirm delivery address (8km radius of Rajnandgaon).
7. PAYMENT → UPI (GPay, PhonePe, Paytm), Card, Net Banking, or Cash on Delivery (COD).
8. PLACE ORDER → COD: emit ACTION:PLACE_ORDER. UPI/Card: emit ACTION:START_CHECKOUT.
9. TRACK → Offer /order-tracking after order is placed.

CRITICAL: ONLY use product names, IDs, and prices EXACTLY as they appear in the LIVE KNOWLEDGE BASE below.

== ABSOLUTE MENU RULES ==
1. Use exact product names, IDs, and prices from the LIVE KNOWLEDGE BASE. Never fabricate.
2. NEVER hallucinate toppings, crusts, sizes, or prices not in the knowledge base.
3. Payment: COD → emit ACTION:PLACE_ORDER. UPI/Card → emit ACTION:START_CHECKOUT.

${strictPromptBlock ? `\n== STRICT MENU & ADDON CONSTRAINTS ==\n${strictPromptBlock}\n` : ''}

== ACTION GRAMMAR (Append exactly ONE at end of response when needed) ==
Add item:     ACTION:{"type":"ADD_TO_CART","payload":{"productId":"<id from KB>","productName":"<name from KB>","price":<price from KB>,"quantity":1,"size":"Medium","crust":"Classic Hand Tossed"}}
Apply coupon: ACTION:{"type":"APPLY_COUPON","payload":{"code":"<COUPON_CODE>"}}
Navigate:     ACTION:{"type":"NAVIGATE","payload":{"path":"/menu"}}
Track order:  ACTION:{"type":"TRACK_ORDER"}
Checkout:     ACTION:{"type":"START_CHECKOUT"}
Place order:  ACTION:{"type":"PLACE_ORDER"}
Search menu:  ACTION:{"type":"SEARCH_MENU","payload":{"query":"spicy pizza"}}

== ACTIVE ORDER ==
${activeOrder}

== LIVE KNOWLEDGE BASE (Products, Prices, Coupons, Settings + Static Policies & FAQs) ==
${kbContext || 'Knowledge base loading... Use general Olive Pizza knowledge to help the customer.'}`;


    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10),
      { role: 'user', content: message },
    ];

    const chatChain = getModelChain();

    if (chatChain.length === 0) {
      return { success: false, error: 'No AI providers configured' };
    }

    let lastError: Error | null = null;

    for (const config of chatChain) {
      const stat = aiProviderStats[config.providerKey as keyof typeof aiProviderStats] as any;
      const modelKey = `${config.providerKey}:${config.model}`;

      if (stat) stat.attempts++;
      try {
        console.log(`[AI Chat] Trying ${config.name}...`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4500);

        let response: any;
        try {
          response = await config.client.chat.completions.create({
            model: config.model,
            messages,
            temperature: 0.6,
            max_tokens: 500,
          }, { signal: controller.signal as any });
        } finally {
          clearTimeout(timeout);
        }

        let reply = response?.choices?.[0]?.message?.content || '';
        if (!reply) throw new Error('Empty response from model');

        reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        if (!reply) throw new Error('Reply was only <think> content');

        let action: any = null;
        // Robust extraction matching ACTION: {...} across singleline or multiline JSON
        const actionMatch = reply.match(/ACTION:\s*(\{[\s\S]*?\})/i);
        if (actionMatch) {
          try {
            action = JSON.parse(actionMatch[1]);
          } catch {
            console.warn('[AI Chat] Could not parse action JSON:', actionMatch[1]);
          }
          // Remove ACTION line from the clean user response
          reply = reply.replace(/ACTION:\s*\{[\s\S]*?\}/gi, '').trim();
        }

        // Phase 17 & 24: Catalog Guard & Zero-Hallucination Validator
        const validation = catalogGuard.validateResponse(reply);
        if (!validation.isValid) {
          console.warn(`[CatalogGuard Intercept] Discarding response due to: ${validation.reason}`);
          reply = validation.sanitizedReply || catalogGuard.sanitizeWithVerifiedCatalog(message);
        }

        if (stat) { stat.ok = true; stat.lastUsed = Date.now(); stat.successes++; }
        aiProviderStats.activeProvider = config.name;
        const elapsed = Date.now() - requestStart;
        aiProviderStats.avgResponseMs = Math.round((aiProviderStats.avgResponseMs * (aiProviderStats.totalRequests - 1) + elapsed) / aiProviderStats.totalRequests);

        const promptTokens = Math.ceil((systemPrompt.length + message.length) / 4);
        const completionTokens = Math.ceil(reply.length / 4);
        const totalTokens = promptTokens + completionTokens;
        const estimatedCostUsd = (totalTokens / 1000) * 0.0002;

        console.log(`[AI Chat] ✅ ${config.name} (${elapsed}ms)`);
        return {
          success: true,
          reply,
          action,
          source: config.name,
          telemetry: {
            llmLatencyMs: elapsed,
            modelUsed: config.model,
            providerUsed: config.providerKey,
            promptTokens,
            completionTokens,
            totalTokens,
            estimatedCostUsd,
          }
        };
      } catch (err: any) {
        const errMsg = err?.message || 'Unknown error';
        console.warn(`[AI Chat] ❌ ${config.name}: ${errMsg}`);
        lastError = err;

        // Auto-blacklist 404, 410, page not found, aborted, or unavailable models for 10 minutes
        if (
          errMsg.includes('404') ||
          errMsg.includes('410') ||
          errMsg.includes('page not found') ||
          errMsg.includes('unavailable') ||
          errMsg.includes('aborted')
        ) {
          console.warn(`[AI Chat] 🚫 Blacklisting model ${modelKey} for 10 minutes due to error: ${errMsg}`);
          blacklistModel(modelKey);
        }
      }

      if (stat) { stat.ok = false; stat.lastError = lastError?.message || 'Failed'; }
      aiProviderStats.totalFailovers++;
    }

    throw new Error(`All AI providers failed. Last: ${lastError?.message}`);
  } catch (error: any) {
    console.error('[AI Chat] Fatal error:', error.message);
    return { success: false, error: error.message };
  }
}


// ── Streaming Chat Reply (for SSE endpoint) ────────────────────────────────────
export async function generateChatReplyStream(
  message: string,
  history: { role: string; content: string }[],
  frontendContext: any,
  onToken: (token: string) => void,
  onComplete: (fullReply: string, action: any, source: string) => void,
): Promise<void> {
  const requestStart = Date.now();
  aiProviderStats.totalRequests++;

  try {
    const kbContext = frontendContext?.kbContext || '';
    const userRole = frontendContext?.role || 'guest';
    const isAuth = frontendContext?.isAuthenticated ?? false;
    const cartItems = frontendContext?.cart?.items || [];
    const cartSummary = cartItems.length > 0
      ? `Cart (${cartItems.length} items): ${cartItems.map((i: any) => `${i.name} x${i.quantity}`).join(', ')}`
      : 'Cart is empty';

    const { resolveProductContext } = await import('./ai/productContextResolver.js');
    const { strictPromptBlock } = await resolveProductContext(message);
    const { detectLanguage: dl, getMultilingualPromptInstruction: gmp } = await import('./ai/languageDetector.js');
    const detectedLang = dl(message);
    const langInstruction = gmp(detectedLang);

    const systemPrompt = `You are Olive AI, the premium 24/7 artisan pizza concierge for Olive Pizza (Rajnandgaon, Chhattisgarh).

== MULTILINGUAL RULES ==
${langInstruction}

== 100% PURE VEGETARIAN RESTAURANT POLICY ==
Olive Pizza is 100% PURE VEGETARIAN. We serve ONLY veg pizzas, sides, desserts, and beverages.

== ROLE ==
User Role: ${userRole.toUpperCase()} (${isAuth ? 'Authenticated' : 'Guest'})

${strictPromptBlock ? `== STRICT MENU CONSTRAINTS ==\n${strictPromptBlock}\n` : ''}

== CART ==
${cartSummary}

== KNOWLEDGE BASE ==
${kbContext || 'Knowledge base syncing...'}`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10),
      { role: 'user', content: message },
    ];

    const chatChain = getModelChain();
    if (chatChain.length === 0) {
      onComplete('No AI providers configured. Please try again later.', null, 'error');
      return;
    }

    let lastError: Error | null = null;

    for (const config of chatChain) {
      const stat = aiProviderStats[config.providerKey as keyof typeof aiProviderStats] as any;
      if (stat) stat.attempts++;

      try {
        console.log(`[AI Stream] Trying ${config.name}...`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        let fullReply = '';
        try {
          const stream = await config.client.chat.completions.create({
            model: config.model,
            messages,
            temperature: 0.6,
            max_tokens: 600,
            stream: true,
          } as any, { signal: controller.signal as any });

          for await (const chunk of stream as any) {
            const token = chunk.choices?.[0]?.delta?.content || '';
            if (token) {
              fullReply += token;
              onToken(token);
            }
          }
        } finally {
          clearTimeout(timeout);
        }

        if (!fullReply) throw new Error('Empty streamed response');

        // Strip <think> tags
        fullReply = fullReply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        // Extract ACTION
        let action: any = null;
        const actionMatch = fullReply.match(/ACTION:\s*(\{[\s\S]*?\})/i);
        if (actionMatch) {
          try { action = JSON.parse(actionMatch[1]); } catch {}
          fullReply = fullReply.replace(/ACTION:\s*\{[\s\S]*?\}/gi, '').trim();
        }

        // Phase 17 & 24: Catalog Guard & Zero-Hallucination Validator
        const validation = catalogGuard.validateResponse(fullReply);
        if (!validation.isValid) {
          console.warn(`[CatalogGuard Stream Intercept] Discarding streamed response due to: ${validation.reason}`);
          fullReply = validation.sanitizedReply || catalogGuard.sanitizeWithVerifiedCatalog(message);
        }

        if (stat) { stat.ok = true; stat.lastUsed = Date.now(); stat.successes++; }
        aiProviderStats.activeProvider = config.name;
        const elapsed = Date.now() - requestStart;
        aiProviderStats.avgResponseMs = Math.round((aiProviderStats.avgResponseMs * (aiProviderStats.totalRequests - 1) + elapsed) / aiProviderStats.totalRequests);

        console.log(`[AI Stream] ✅ ${config.name} (${elapsed}ms, ${fullReply.length} chars)`);
        onComplete(fullReply, action, config.name);
        return;
      } catch (err: any) {
        const errMsg = err?.message || 'Unknown error';
        console.warn(`[AI Stream] ❌ ${config.name}: ${errMsg}`);
        lastError = err;
        if (errMsg.includes('404') || errMsg.includes('410') || errMsg.includes('unavailable') || errMsg.includes('aborted')) {
          blacklistModel(`${config.providerKey}:${config.model}`);
        }
        if (stat) { stat.ok = false; stat.lastError = errMsg; }
        aiProviderStats.totalFailovers++;
      }
    }

    onComplete(`I'm having trouble connecting right now. Please try again in a moment. 🍕`, null, 'error');
  } catch (error: any) {
    console.error('[AI Stream] Fatal error:', error.message);
    onComplete('An error occurred. Please try again.', null, 'error');
  }
}

// ── Build optimized food photography prompt from product details ───────────────
function buildProductImagePrompt(
  productName: string,
  description?: string,
  category?: string,
  ingredients?: string,
  toppings?: string[],
  sizes?: string[],
  crusts?: string[],
  imageType?: string
): string {
  const typeDescriptions: Record<string, string> = {
    product_photo: 'professional product photography, top-down angle, clean background, studio lighting',
    menu_card: 'menu card style, elegant presentation, warm lighting, restaurant menu quality',
    promotional_banner: 'wide promotional banner, vibrant colors, dynamic lighting, marketing campaign',
    social_media: 'square social media post, Instagram-worthy, bright and inviting, lifestyle photography',
    combo_offer: 'combo meal flat-lay, multiple items arranged artfully, promotional quality',
  };

  const style = typeDescriptions[imageType || 'product_photo'] || typeDescriptions.product_photo;

  let prompt = `Ultra-realistic food photography of "${productName}"`;

  if (category) prompt += `, a ${category}`;

  const details: string[] = [];
  if (description) details.push(description);
  if (ingredients) details.push(`made with ${ingredients}`);
  if (toppings && toppings.length) details.push(`topped with ${toppings.join(', ')}`);
  if (crusts && crusts.length) details.push(`${crusts[0]} crust`);
  if (details.length) prompt += ` — ${details.join(', ')}`;

  prompt += `. ${style}. Dark marble surface, dramatic studio lighting, vibrant appetizing colors, melted cheese visible, garnished with fresh herbs. Commercial restaurant photography quality matching Domino's or Pizza Hut marketing campaigns. 4K ultra-sharp, photorealistic food styling by a professional chef. Olive Pizza restaurant presentation.`;

  return prompt;
}

// ── Generate AI Product Image ─────────────────────────────────────────────────
export async function generateProductImage(params: {
  productName: string;
  description?: string;
  category?: string;
  ingredients?: string;
  toppings?: string[];
  sizes?: string[];
  crusts?: string[];
  imageType?: string;
  customPrompt?: string;
  modelName?: string;
  baseImageUrl?: string | null;
}): Promise<{
  success: boolean;
  imageUrl?: string;
  publicId?: string;
  prompt?: string;
  model?: string;
  error?: string;
}> {
  const { productName, description, category, ingredients, toppings, sizes, crusts, imageType, customPrompt, modelName, baseImageUrl } = params;

  let prompt = customPrompt || buildProductImagePrompt(productName, description, category, ingredients, toppings, sizes, crusts, imageType);
  if (baseImageUrl && modelName === 'qwen-image-edit') {
    prompt = `[IMAGE EDIT INSTRUCTION] Remake this exact concept but apply these edits: ${prompt}. Maintain the original color palette and composition.`;
  }
  const negativePrompt = 'blurry, low quality, pixelated, distorted, watermark, text overlay, sketch, cartoon, anime, illustration, placeholder, stock photo, clipart, ugly, unappetizing, generic, draft quality, wrong food, different dish';

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('[PRODUCT_IMAGE_REQUEST]');
  console.log('  Product:', productName);
  console.log('  Type:', imageType || 'product_photo');
  console.log('  Prompt (first 120):', prompt.slice(0, 120) + '...');
  console.log('═══════════════════════════════════════════════════');

  const errors: string[] = [];

  // ── ATTEMPT 1: Qwen Image Model (NVIDIA NIM primary) ──────────────────────
  // Qwen Image via NVIDIA uses the standard OpenAI images.generate endpoint
  console.log('[PRODUCT_IMAGE] → Qwen Image (NVIDIA NIM primary)');
  try {
    const qwenRes = await fetch('https://integrate.api.nvidia.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getKey('NVIDIA_API_KEY')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen-image',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'url',
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (qwenRes.ok) {
      const qwenData: any = await qwenRes.json();
      const imageUrl = qwenData?.data?.[0]?.url;
      const b64 = qwenData?.data?.[0]?.b64_json;

      if (imageUrl || b64) {
        console.log('[PRODUCT_IMAGE] ✅ Qwen Image success');
        const dataToUpload = b64 ? `data:image/png;base64,${b64}` : imageUrl;
        try {
          const upload = await cloudinary.uploader.upload(dataToUpload!, {
            folder: 'olive-pizza/ai-product-images',
            resource_type: 'image',
            format: 'jpg',
            quality: 90,
            transformation: [{ width: 1200, crop: 'limit' }],
            context: `productName=${productName.slice(0, 100)}|imageType=${imageType || 'product_photo'}|model=qwen-image-nvidia`,
          });
          console.log('[CLOUDINARY] ✅ Uploaded:', upload.secure_url);
          return { success: true, imageUrl: upload.secure_url, publicId: upload.public_id, prompt, model: 'Qwen Image (NVIDIA)' };
        } catch (uploadErr: any) {
          errors.push(`Cloudinary upload (Qwen): ${uploadErr.message}`);
        }
      } else {
        errors.push('Qwen Image: no URL or b64 in response');
      }
    } else {
      const errText = await qwenRes.text();
      errors.push(`Qwen Image: HTTP ${qwenRes.status} — ${errText.slice(0, 200)}`);
      console.warn('[PRODUCT_IMAGE] ❌ Qwen Image:', errors[errors.length - 1]);
    }
  } catch (e: any) {
    errors.push(`Qwen Image: ${e.message}`);
    console.warn('[PRODUCT_IMAGE] ❌ Qwen Image:', e.message);
  }

  // ── ATTEMPT 2: NVIDIA SDXL endpoints ──────────────────────────────────────
  const nvEndpoints = [
    {
      name: 'NVIDIA SDXL',
      url: 'https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-xl',
      body: {
        text_prompts: [
          { text: prompt, weight: 1 },
          { text: negativePrompt, weight: -1 },
        ],
        height: 768, width: 768,
        seed: Math.floor(Math.random() * 9999999),
        steps: 30, cfg_scale: 7.5, sampler: 'K_DPMPP_2M',
      },
      extractBase64: (r: any) => r?.artifacts?.[0]?.base64 ?? null,
    },
    {
      name: 'NVIDIA SDXL Turbo',
      url: 'https://ai.api.nvidia.com/v1/genai/stabilityai/sdxl-turbo',
      body: {
        text_prompts: [
          { text: prompt, weight: 1 },
          { text: negativePrompt, weight: -1 },
        ],
        height: 512, width: 512,
        seed: Math.floor(Math.random() * 9999999),
        steps: 4, cfg_scale: 0,
      },
      extractBase64: (r: any) => r?.artifacts?.[0]?.base64 ?? null,
    },
  ];

  for (const endpoint of nvEndpoints) {
    console.log(`[PRODUCT_IMAGE] → ${endpoint.name}`);
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getKey('NVIDIA_API_KEY')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(endpoint.body),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const errText = await response.text();
        errors.push(`${endpoint.name}: HTTP ${response.status}: ${errText.slice(0, 200)}`);
        console.warn(`[PRODUCT_IMAGE] ❌ ${endpoint.name}:`, errors[errors.length - 1]);
        continue;
      }

      const result = await response.json();
      const base64 = endpoint.extractBase64(result);
      if (!base64 || base64.length < 100) {
        errors.push(`${endpoint.name}: empty base64`);
        continue;
      }

      console.log(`[PRODUCT_IMAGE] ✅ ${endpoint.name}`);
      const dataUri = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
      const upload = await cloudinary.uploader.upload(dataUri, {
        folder: 'olive-pizza/ai-product-images',
        resource_type: 'image',
        format: 'jpg', quality: 90,
        transformation: [{ width: 1200, crop: 'limit' }],
        context: `productName=${productName.slice(0, 100)}|imageType=${imageType || 'product_photo'}|model=${endpoint.name}`,
      });
      console.log('[CLOUDINARY] ✅ Uploaded:', upload.secure_url);
      return { success: true, imageUrl: upload.secure_url, publicId: upload.public_id, prompt, model: endpoint.name };
    } catch (e: any) {
      errors.push(`${endpoint.name}: ${e.message}`);
      console.warn(`[PRODUCT_IMAGE] ❌ ${endpoint.name}:`, e.message);
    }
  }

  // ── ATTEMPT 3: Pollinations.AI (FLUX fallback, no API key needed) ──────────
  const pollUrls = [
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux&seed=${Math.floor(Math.random() * 9999999)}&nologo=true&enhance=true`,
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux-realism&seed=${Math.floor(Math.random() * 9999999)}&nologo=true`,
  ];

  for (const pollUrl of pollUrls) {
    const modelName = pollUrl.match(/model=([^&]+)/)?.[1] || 'flux';
    console.log(`[PRODUCT_IMAGE] → Pollinations (${modelName}) fallback`);
    try {
      const response = await fetch(pollUrl, { method: 'GET', signal: AbortSignal.timeout(90000) });
      if (!response.ok) { errors.push(`Pollinations ${modelName}: HTTP ${response.status}`); continue; }
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) { errors.push(`Pollinations ${modelName}: wrong content-type`); continue; }
      const imageBuffer = Buffer.from(await response.arrayBuffer());
      if (imageBuffer.length < 5000) { errors.push(`Pollinations ${modelName}: too small`); continue; }

      console.log(`[PRODUCT_IMAGE] ✅ Pollinations ${modelName} — ${imageBuffer.length} bytes`);
      const dataUri = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      const upload = await cloudinary.uploader.upload(dataUri, {
        folder: 'olive-pizza/ai-product-images',
        resource_type: 'image',
        format: 'jpg', quality: 90,
        transformation: [{ width: 1200, crop: 'limit' }],
        context: `productName=${productName.slice(0, 100)}|imageType=${imageType || 'product_photo'}|model=pollinations-${modelName}`,
      });
      console.log('[CLOUDINARY] ✅ Uploaded:', upload.secure_url);
      return { success: true, imageUrl: upload.secure_url, publicId: upload.public_id, prompt, model: `Pollinations ${modelName}` };
    } catch (e: any) {
      errors.push(`Pollinations ${modelName}: ${e.message}`);
      console.warn(`[PRODUCT_IMAGE] ❌ Pollinations ${modelName}:`, e.message);
    }
  }

  // ── ALL FAILED ─────────────────────────────────────────────────────────────
  const errorSummary = errors.join(' | ');
  console.error('[PRODUCT_IMAGE] All attempts failed:', errorSummary);
  return { success: false, error: `Image generation failed. Tried: Qwen Image (NVIDIA), SDXL, SDXL Turbo, Pollinations FLUX. Errors: ${errorSummary}` };
}

// ── Generate image via Pollinations + upload to Cloudinary (for email banners) ─
export async function generateImage(
  prompt: string,
  context?: { productName?: string; category?: string; description?: string },
  modelName?: string,
  baseImageUrl?: string | null
): Promise<{ success: boolean; imageUrl?: string; publicId?: string; error?: string }> {
  let enhancedPrompt = prompt;
  if (context?.productName) {
    enhancedPrompt += `. Featuring ${context.productName}`;
  }
  if (context?.category) {
    enhancedPrompt += `, category: ${context.category}`;
  }
  if (context?.description) {
    enhancedPrompt += `, style/description: ${context.description}`;
  }
  if (baseImageUrl && modelName === 'qwen-image-edit') {
    enhancedPrompt = `[IMAGE EDIT INSTRUCTION] Remake this exact concept but apply these edits: ${enhancedPrompt}. Maintain the original color palette and layout.`;
  }
  enhancedPrompt += `. High quality commercial photography, 4K, vivid colors. Professional restaurant advertising photography, photorealistic, commercial quality. Olive Pizza restaurant branding, vibrant orange and dark theme, studio lighting, 4K quality, appetizing food styling.`;
  const negativePrompt = 'blurry, low quality, pixelated, distorted, watermark, text overlay, sketch, cartoon, anime, illustration, placeholder, stock photo, clipart, ugly, unappetizing';

  const errors: string[] = [];

  // Pollinations first (fast, free)
  const pollUrls = [
    `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=768&model=flux&seed=${Math.floor(Math.random() * 9999999)}&nologo=true&enhance=true`,
    `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=768&model=flux-realism&seed=${Math.floor(Math.random() * 9999999)}&nologo=true`,
  ];

  for (const pollUrl of pollUrls) {
    const modelName = pollUrl.match(/model=([^&]+)/)?.[1] || 'flux';
    try {
      const response = await fetch(pollUrl, { method: 'GET', signal: AbortSignal.timeout(60000) });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) continue;
      const imageBuffer = Buffer.from(await response.arrayBuffer());
      if (imageBuffer.length < 5000) continue;

      const dataUri = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      const upload = await cloudinary.uploader.upload(dataUri, {
        folder: 'olive-pizza/ai-generated',
        resource_type: 'image',
        format: 'jpg', quality: 90,
        transformation: [{ width: 1200, crop: 'limit' }],
        context: `prompt=${prompt.slice(0, 200)}|model=pollinations-${modelName}`,
      });
      return { success: true, imageUrl: upload.secure_url, publicId: upload.public_id };
    } catch (e: any) {
      errors.push(`Pollinations ${modelName}: ${e.message}`);
    }
  }

  // NVIDIA SDXL fallback
  const nvEndpoints = [
    {
      name: 'NVIDIA SDXL',
      url: 'https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-xl',
      body: { text_prompts: [{ text: enhancedPrompt, weight: 1 }, { text: negativePrompt, weight: -1 }], height: 512, width: 768, seed: Math.floor(Math.random() * 9999999), steps: 30, cfg_scale: 7.5, sampler: 'K_DPMPP_2M' },
      extractBase64: (r: any) => r?.artifacts?.[0]?.base64 ?? null,
    },
  ];

  for (const endpoint of nvEndpoints) {
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getKey('NVIDIA_API_KEY')}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(endpoint.body),
      });
      if (!response.ok) { errors.push(`${endpoint.name}: HTTP ${response.status}`); continue; }
      const result = await response.json();
      const base64 = endpoint.extractBase64(result);
      if (!base64 || base64.length < 100) { errors.push(`${endpoint.name}: empty`); continue; }
      const dataUri = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
      const upload = await cloudinary.uploader.upload(dataUri, { folder: 'olive-pizza/ai-generated', resource_type: 'image', format: 'jpg', quality: 90, transformation: [{ width: 1200, crop: 'limit' }], context: `prompt=${prompt.slice(0, 200)}|model=${endpoint.name}` });
      return { success: true, imageUrl: upload.secure_url, publicId: upload.public_id };
    } catch (e: any) {
      errors.push(`${endpoint.name}: ${e.message}`);
    }
  }

  return { success: false, error: `Image generation failed. Errors: ${errors.join(' | ')}` };
}

// ── Generate Product Description (FIXED: uses fallback model chain) ────────────
export async function generateProductDescription(
  messages: { role: string, content: string }[]
): Promise<{ success: boolean; text?: string; error?: string }> {
  const systemPrompt = `You are an expert pizza shop AI assistant. Your goal is to help the owner write a delicious, mouth-watering product description.
If the owner just provides a product name, ask 1 or 2 quick questions to understand the ingredients or flavor profile.
If you have enough information, generate the final description (2-3 sentences max).
When you output the final description, prefix it EXACTLY with "FINAL_DESCRIPTION: " so the system can extract it. Keep it appetizing and professional.`;

  let lastError: Error | null = null;
  for (const config of MODEL_CHAIN) {
    try {
      console.log(`[AI Desc] Trying ${config.name}...`);
      const response = await config.client.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ] as any[],
        temperature: 0.7,
        max_tokens: 500,
      });
      const text = response.choices[0]?.message?.content || '';
      if (!text) throw new Error('Empty response');
      console.log(`[AI Desc] ✅ ${config.name}`);
      return { success: true, text };
    } catch (err: any) {
      console.warn(`[AI Desc] ❌ ${config.name}: ${err.message}`);
      lastError = err;
    }
  }
  return { success: false, error: `Failed to generate description. Last error: ${lastError?.message}` };
}

// ── Enhance Image Prompt (DeepSeek R1 primary, Qwen fallback) ────────────────
export async function enhancePrompt(prompt: string, type: string): Promise<{ success: boolean; text?: string; error?: string }> {
  const systemPrompt = `You are an expert prompt engineer specializing in AI image generation for a premium pizza brand called Olive Pizza.
Your task is to take a short, basic prompt from the user and expand it into a highly detailed, evocative, and professional image generation prompt.
Do not include any conversational filler, explanations, or quotes. Output ONLY the enhanced prompt.
Always include cinematic lighting, photorealism, and appetizing food photography descriptors.
Type context: ${type === 'banner' ? 'Wide promotional marketing banner, dynamic composition' : 'Close-up product photography, mouth-watering details'}.
CRITICAL INSTRUCTION: You must provide the final prompt immediately. Keep your <think> reasoning extremely brief (under 3 sentences) to ensure a fast response under 20 seconds.`;

  const chain = getModelChain();

  let lastError: Error | null = null;
  for (const config of chain) {
    try {
      console.log(`[AI Enhance] Trying ${config.name}...`);
      const response = await config.client.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });
      let text = response.choices[0]?.message?.content || '';
      if (!text) throw new Error('Empty response');
      // Deepseek R1 often includes <think> blocks, we should strip them out just in case
      text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      
      console.log(`[AI Enhance] ✅ ${config.name}`);
      return { success: true, text };
    } catch (err: any) {
      console.warn(`[AI Enhance] ❌ ${config.name}: ${err.message}`);
      lastError = err;
    }
  }
  return { success: false, error: `Failed to enhance prompt. Last error: ${lastError?.message}` };
}

// ── Speech-to-Text Transcription (Whisper 3 Large Primary -> Canary 1B Fallback) ──
export async function transcribeAudioWhisper(audioBuffer: Buffer, mimeType: string = 'audio/wav'): Promise<{ success: boolean; text?: string; error?: string }> {
  // ATTEMPT 1: Whisper-large-v3 via NVIDIA NIM or OpenRouter or Groq / OpenAI
  const nvKey = getKey('NVIDIA_API_KEY');
  const orKey = getKey('OPENROUTER_API_KEY');
  
  if (isValidKey(nvKey)) {
    try {
      console.log(`[STT] Transcribing audio via Whisper 3 Large (openai/whisper-large-v3)...`);
      const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
      const formData = new FormData();
      formData.append('file', blob, 'speech.wav');
      formData.append('model', 'openai/whisper-large-v3');

      const res = await fetch('https://integrate.api.nvidia.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${nvKey}` },
        body: formData
      });

      if (res.ok) {
        const data: any = await res.json();
        const transcript = data.text || data.transcript || '';
        if (transcript.trim()) {
          console.log(`[STT] ✅ Whisper 3 Large Result: "${transcript}"`);
          return { success: true, text: transcript };
        }
      }
    } catch (err: any) {
      console.warn('[STT] Whisper 3 Large (NVIDIA) attempt failed, trying fallback:', err.message);
    }
  }

  if (isValidKey(orKey)) {
    try {
      const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
      const formData = new FormData();
      formData.append('file', blob, 'speech.wav');
      formData.append('model', 'openai/whisper-large-v3');

      const res = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${orKey}` },
        body: formData
      });

      if (res.ok) {
        const data: any = await res.json();
        const transcript = data.text || data.transcript || '';
        if (transcript.trim()) {
          console.log(`[STT] ✅ Whisper 3 Large (OpenRouter) Result: "${transcript}"`);
          return { success: true, text: transcript };
        }
      }
    } catch (err: any) {
      console.warn('[STT] Whisper 3 Large (OpenRouter) attempt failed:', err.message);
    }
  }

  // ATTEMPT 2: Fallback to NVIDIA Canary 1B ASR
  console.log('[STT] Falling back to NVIDIA Canary 1B ASR...');
  return transcribeAudioCanary(audioBuffer, mimeType);
}

export async function transcribeAudioCanary(audioBuffer: Buffer, mimeType: string = 'audio/wav'): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const key = getKey('NVIDIA_API_KEY');
    if (!isValidKey(key)) {
      return { success: false, error: 'NVIDIA API key not configured for Canary ASR' };
    }

    console.log(`[STT] Transcribing audio payload (${audioBuffer.length} bytes, type=${mimeType}) via nvidia/canary-1b-asr...`);
    
    // Construct multipart form data for transcription endpoint
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, 'speech.wav');
    formData.append('model', 'nvidia/canary-1b-asr');
    formData.append('language', 'hi'); // Hindi + English multilingual STT

    const res = await fetch('https://integrate.api.nvidia.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`
      },
      body: formData
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[STT] Canary ASR NIM error (${res.status}): ${errText}`);
      throw new Error(`Canary ASR error ${res.status}: ${errText}`);
    }

    const data: any = await res.json();
    const transcript = data.text || data.transcript || '';
    console.log(`[STT] ✅ Canary ASR Result: "${transcript}"`);
    return { success: true, text: transcript };
  } catch (error: any) {
    console.error('[STT] Canary ASR failed:', error.message);
    return { success: false, error: error.message };
  }
}

