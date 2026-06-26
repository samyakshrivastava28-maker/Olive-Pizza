import OpenAI from 'openai';
import dotenv from 'dotenv';
import cloudinary from '../config/cloudinary.js';

dotenv.config();

const nvidiaApiKey = process.env.NVIDIA_API_KEY || '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';
const openRouterApiKey = process.env.OPENROUTER_API_KEY || '';

const nvidiaClient = new OpenAI({
  apiKey: nvidiaApiKey,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

const openRouterClient = new OpenAI({
  apiKey: openRouterApiKey,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://olivepizza.app',
    'X-Title': 'Olive Pizza Marketing Center',
  },
});

// ── Model fallback chain ───────────────────────────────────────────────────────
const MODEL_CHAIN = [
  { client: nvidiaClient, model: 'deepseek-ai/deepseek-r1-distill-qwen-32b', name: 'DeepSeek R1 (NVIDIA)' },
  { client: nvidiaClient, model: 'qwen/qwen3-235b-a22b', name: 'Qwen 3 235B (NVIDIA)' },
  { client: nvidiaClient, model: 'z-ai/glm-5.1', name: 'GLM 5.1 (NVIDIA)' },
  { client: nvidiaClient, model: 'google/gemma-2-27b-it', name: 'Gemma 2 27B (NVIDIA)' },
  { client: openRouterClient, model: 'google/gemma-2-27b-it', name: 'Gemma 2 (OpenRouter)' },
  { client: openRouterClient, model: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 (OpenRouter)' },
];

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
): Promise<{ success: boolean; reply?: string; action?: any; error?: string }> {
  try {
    const systemPrompt = `You are the Olive Pizza AI Assistant — a friendly, helpful, and enthusiastic food assistant for Olive Pizza, a premium pizza delivery restaurant in Rajnandgaon, Chhattisgarh, India.

You help customers with:
- Pizza recommendations and menu questions
- Navigating the app (orders, cart, tracking)
- Answering questions about ingredients, vegetarian options, pricing
- Helping with order issues

Current context:
- Page: ${frontendContext?.route || '/'}
- User role: ${frontendContext?.role || 'guest'}
- Cart items: ${JSON.stringify(frontendContext?.cart?.items || [])}
- Cart total: ₹${frontendContext?.cart?.total || 0}

RULES:
1. Be warm, enthusiastic, use food emojis naturally 🍕🧀🔥
2. Keep replies SHORT — 1-3 sentences max unless the user asks for details
3. If the user wants to navigate somewhere, add an action JSON at the END of your reply like: ACTION:{"type":"NAVIGATE","payload":{"path":"/menu"}}
4. If user wants to add to cart: ACTION:{"type":"ADD_TO_CART","payload":{"productId":"xxx","productName":"xxx","price":0,"quantity":1}}
5. Only add ACTION if the user explicitly requests navigation or cart action
6. Always recommend Olive Pizza products enthusiastically`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8), // keep last 8 messages for context
      { role: 'user', content: message },
    ];

    let lastError: Error | null = null;
    for (const config of MODEL_CHAIN) {
      try {
        console.log(`[AI Chat] Trying ${config.name}...`);
        const response = await config.client.chat.completions.create({
          model: config.model,
          messages,
          temperature: 0.8,
          max_tokens: 400,
        });

        let reply = response.choices[0]?.message?.content || '';
        if (!reply) throw new Error('Empty response');

        // Extract action if present
        let action = null;
        const actionMatch = reply.match(/ACTION:(\{.*?\})/s);
        if (actionMatch) {
          try {
            action = JSON.parse(actionMatch[1]);
            reply = reply.replace(/ACTION:\{.*?\}/s, '').trim();
          } catch {}
        }

        console.log(`[AI Chat] ✅ ${config.name}`);
        return { success: true, reply, action };
      } catch (err: any) {
        console.warn(`[AI Chat] ❌ ${config.name}: ${err.message}`);
        lastError = err;
      }
    }
    throw new Error(`All models failed: ${lastError?.message}`);
  } catch (error: any) {
    console.error('[AI Chat] Fatal:', error);
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
Type context: ${type === 'banner' ? 'Wide promotional marketing banner, dynamic composition' : 'Close-up product photography, mouth-watering details'}.`;

  // Explicit chain for this task: DeepSeek R1 -> Qwen
  const chain = [
    { client: nvidiaClient, model: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1' },
    { client: nvidiaClient, model: 'qwen/qwen2.5-72b-instruct', name: 'Qwen 2.5 72B' },
    { client: nvidiaClient, model: 'meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B' }
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
        max_tokens: 300,
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
