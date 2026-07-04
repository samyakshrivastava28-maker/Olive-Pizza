import OpenAI from 'openai';
import dotenv from 'dotenv';
import cloudinary from '../config/cloudinary.js';

dotenv.config();

// ── API key helpers ───────────────────────────────────────────────────────────
function getKey(name: string): string { return process.env[name] || ''; }
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

// ── Model chain (priority order for general tasks) ────────────────────────────
// Resolved lazily so missing keys are skipped without crashing
function getModelChain() {
  const chain: { client: OpenAI; model: string; name: string; providerKey: string }[] = [];
  const nvidia = getNvidiaClient();
  const or = getOpenRouterClient();
  const gemini = getGeminiClient();
  if (nvidia) {
    chain.push({ client: nvidia, model: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1 (NVIDIA)', providerKey: 'nvidia' });
    chain.push({ client: nvidia, model: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B (NVIDIA)', providerKey: 'nvidia' });
  }
  if (or) {
    chain.push({ client: or, model: 'google/gemma-2-27b-it', name: 'Gemma 2 (OpenRouter)', providerKey: 'openrouter' });
  }
  if (gemini) {
    // Gemini 2.5 Flash as final fallback
    chain.push({ client: gemini, model: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', providerKey: 'gemini' });
    chain.push({ client: gemini, model: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', providerKey: 'gemini' });
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
): Promise<{ success: boolean; reply?: string; action?: any; source?: string; error?: string }> {
  aiProviderStats.totalRequests++;
  const requestStart = Date.now();

  try {
    const kbContext = frontendContext?.kbContext || '';
    const cartSummary = (frontendContext?.cart?.items || []).length > 0
      ? `Cart: ${(frontendContext.cart.items as string[]).join(', ')} | Total: ₹${frontendContext.cart.total}`
      : 'Cart is empty';

    const systemPrompt = `You are the Olive Pizza AI Assistant — a friendly, accurate, and enthusiastic food assistant for Olive Pizza restaurant in Rajnandgaon, Chhattisgarh, India.

== ABSOLUTE RULES ==
1. NEVER hallucinate products, prices, or availability. Use ONLY the LIVE KNOWLEDGE BASE.
2. If a product is not listed in the KB, say it is currently unavailable.
3. Keep replies concise (2–4 sentences) unless the user asks for detail.
4. Use food emojis warmly 🍕🔥🧀 — be friendly and enthusiastic.
5. NEVER expose passwords, API keys, owner finances, or internal database structure.
6. NEVER auto-execute any action — always present action JSON and wait for user approval.

== ACTION GRAMMAR (emit ONE action per message maximum) ==
For navigation:     ACTION:{"type":"NAVIGATE","payload":{"path":"/menu"}}
For product page:   ACTION:{"type":"NAVIGATE","payload":{"path":"/product/PRODUCT_ID"}}
For cart page:      ACTION:{"type":"NAVIGATE","payload":{"path":"/cart"}}
For checkout:       ACTION:{"type":"NAVIGATE","payload":{"path":"/checkout"}}
For orders:         ACTION:{"type":"NAVIGATE","payload":{"path":"/dashboard"}}
For search:         ACTION:{"type":"NAVIGATE","payload":{"path":"/menu?search=QUERY"}}
For add to cart:    ACTION:{"type":"ADD_TO_CART","payload":{"productId":"ID","productName":"NAME","price":PRICE,"quantity":1,"variant":"VARIANT_OR_EMPTY","imageUrl":"URL_OR_EMPTY"}}
For apply coupon:   ACTION:{"type":"APPLY_COUPON","payload":{"code":"CODE"}}

RULES FOR ACTIONS:
- Only include ACTION if the user clearly and explicitly requests it ("add to cart", "go to menu", "apply coupon XYZ").
- For ADD_TO_CART: use exact productId, name, and price FROM THE KNOWLEDGE BASE — never invent.
- For ADD_TO_CART: if the product has size variants, first ask which size the user wants, then emit the action.
- Never add to cart without explicit user request AND correct product data from KB.

== LIVE KNOWLEDGE BASE ==
${kbContext || 'Knowledge base syncing. Answer from general restaurant knowledge only.'}

== LIVE CONTEXT ==
- Page: ${frontendContext?.route || '/'}
- User: ${frontendContext?.role || 'guest'}${frontendContext?.isAuthenticated ? ' (logged in)' : ' (not logged in)'}
- ${cartSummary}`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10),
      { role: 'user', content: message },
    ];

    const chatChain = getModelChain();

    if (chatChain.length === 0) {
      // No providers configured — return graceful offline reply
      return { success: false, error: 'No AI providers configured' };
    }

    let lastError: Error | null = null;
    for (const config of chatChain) {
      const stat = aiProviderStats[config.providerKey as keyof typeof aiProviderStats] as any;
      if (stat) stat.attempts++;

      try {
        console.log(`[AI Chat] Trying ${config.name}...`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        let response: any;
        try {
          response = await config.client.chat.completions.create({
            model: config.model,
            messages,
            temperature: 0.65,
            max_tokens: 500,
          }, { signal: controller.signal as any });
        } finally {
          clearTimeout(timeout);
        }

        let reply = response?.choices?.[0]?.message?.content || '';
        if (!reply) throw new Error('Empty response from model');

        // Strip <think> blocks (reasoning models like DeepSeek R1)
        reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        if (!reply) throw new Error('Reply was only <think> content');

        // Extract ACTION JSON if present
        let action: any = null;
        const actionMatch = reply.match(/ACTION:(\{[^\n]+\})/);
        if (actionMatch) {
          try {
            action = JSON.parse(actionMatch[1]);
            reply = reply.replace(/ACTION:\{[^\n]+\}/, '').trim();
          } catch { /* malformed action — skip it */ }
        }

        // Update stats
        if (stat) { stat.ok = true; stat.lastUsed = Date.now(); stat.successes++; }
        aiProviderStats.activeProvider = config.name;
        const elapsed = Date.now() - requestStart;
        aiProviderStats.avgResponseMs = Math.round((aiProviderStats.avgResponseMs * (aiProviderStats.totalRequests - 1) + elapsed) / aiProviderStats.totalRequests);

        console.log(`[AI Chat] ✅ ${config.name} (${elapsed}ms)`);
        return { success: true, reply, action, source: config.name };
      } catch (err: any) {
        const errMsg = err?.message || 'Unknown error';
        console.warn(`[AI Chat] ❌ ${config.name}: ${errMsg}`);
        if (stat) { stat.ok = false; stat.lastError = errMsg; }
        aiProviderStats.totalFailovers++;
        lastError = err;
      }
    }
    throw new Error(`All AI providers failed. Last: ${lastError?.message}`);
  } catch (error: any) {
    console.error('[AI Chat] Fatal error (returning to offline mode):', error.message);
    return { success: false, error: error.message };
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
        'Authorization': `Bearer ${nvidiaApiKey}`,
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
          'Authorization': `Bearer ${nvidiaApiKey}`,
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
        headers: { 'Authorization': `Bearer ${nvidiaApiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
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

  // Explicit chain for this task: DeepSeek R1 -> Gemini
  const chain = [
    { client: openRouterClient, model: 'deepseek/deepseek-r1', name: 'DeepSeek R1' },
    { client: nvidiaClient, model: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1 (Nvidia)' },
    { client: geminiClient, model: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  ];

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
