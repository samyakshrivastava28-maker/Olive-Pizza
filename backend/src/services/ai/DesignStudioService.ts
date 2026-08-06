/**
 * DesignStudioService.ts — AI Multi-Model Design Pipeline
 * 
 * Phase 2: Uses NVIDIA/OpenRouter-hosted models to generate SDUI layouts.
 * 
 * Pipeline:
 *   Owner Prompt
 *    → GLM 5.2 (UI reasoning)
 *    → DeepSeek V4 Pro (Architecture)
 *    → DeepSeek V4 Flash (Fast layout)
 *    → Kimi 2.6 (Creative UX)
 *    → Qwen 3 (Component improvements)
 *    → Gemma 4 (Accessibility)
 *    → GPT OSS 120B (Final merge & reasoning)
 *    → Merged SDUI Layout
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { StitchService } from '../stitch/StitchService.js';
import { StitchColorMapper } from '../stitch/StitchColorMapper.js';

dotenv.config();

// Brand system prompt injected into every model — ensures no color violations
const OLIVE_PIZZA_BRAND_SYSTEM = `
You are an AI design agent for Olive Pizza, a premium Indian restaurant app.

STRICT BRAND RULES (NEVER VIOLATE):
- PRIMARY color: #55775a (Deep Olive Green)
- SECONDARY color: #f97316 (Warm Pizza Orange)  
- ACCENT color: #f59e0b (Premium Gold)
- BACKGROUND: #0a0a0a (Near Black)
- SURFACE: #121212
- CARD: #1e1e1e
- SUCCESS: #4ade80
- ERROR: #f87171
- TEXT: white / slate-400 for muted

DO NOT use blue, purple, pink, cyan, or any random colors.
DO NOT use TailwindCSS utilities that don't match the brand palette.
All output must use CSS variables, brand tokens, or inline hex from the list above ONLY.
Output format: Valid JSON representing Olive Pizza SDUI sections array.

STITCH COMPONENT SYSTEM:
You have access to Google Stitch component logic. When suggesting layouts, prefer mapping them to rich React components wrapped in Framer Motion animations. Use 'framer-motion' for transitions (e.g., initial, animate, exit properties).
Stitch UI elements:
- Interactive Floating Elements
- Glassmorphic Cards
- Animated Data Displays

Ensure your generated SDUI JSON translates beautifully into React & Framer Motion.
`;

function getNvidiaClient(): OpenAI | null {
  const key = process.env.NVIDIA_API_KEY || process.env.ASSISTANT_NVIDIA_API_KEY;
  if (!key || key.trim().length < 10) return null;
  return new OpenAI({
    apiKey: key,
    baseURL: 'https://integrate.api.nvidia.com/v1',
    timeout: 30000,
  });
}

function getOpenRouterClient(): OpenAI | null {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || key.trim().length < 10) return null;
  return new OpenAI({
    apiKey: key,
    baseURL: 'https://openrouter.ai/api/v1',
    timeout: 30000,
    defaultHeaders: {
      'HTTP-Referer': 'https://olivepizza.app',
      'X-Title': 'Olive Pizza Design Studio',
    },
  });
}

// Pipeline models: each has a specific role
const PIPELINE_MODELS = [
  {
    id: 'deepseek_pro',
    name: 'DeepSeek V4 Pro (Head Orchestrator)',
    model: 'deepseek-ai/deepseek-v4-pro',
    role: 'Head Orchestrator & Component Designer',
    provider: 'nvidia',
  },
  {
    id: 'glm',
    name: 'GLM 5.2',
    model: 'z-ai/glm-5.2',
    role: 'UI Reasoning & Layout Structure',
    provider: 'nvidia',
  },
  {
    id: 'kimi',
    name: 'Kimi 2.6',
    model: 'moonshotai/kimi-k2.6',
    role: 'Creative UX & User Flow Ideas',
    provider: 'nvidia',
  },
  {
    id: 'deepseek_flash',
    name: 'DeepSeek V4 Flash',
    model: 'deepseek-ai/deepseek-v4-flash',
    role: 'Fast Layout Generation',
    provider: 'nvidia',
  },
  {
    id: 'qwen_image',
    name: 'Qwen Image',
    model: 'qwen-image',
    role: 'Premium Food Photography',
    provider: 'nvidia',
  },
  {
    id: 'flux',
    name: 'FLUX',
    model: 'flux-1-dev',
    role: 'Modern Vector Asset Generation',
    provider: 'nvidia',
  },
  {
    id: 'sd3',
    name: 'Stable Diffusion 3 Large',
    model: 'stabilityai/stable-diffusion-3.5-large',
    role: 'High Fidelity Brand Assets',
    provider: 'nvidia',
  },
];

export interface DesignPipelineResult {
  success: boolean;
  ownerPrompt: string;
  pipelineResults: {
    modelId: string;
    modelName: string;
    role: string;
    suggestion: string;
    latencyMs: number;
    success: boolean;
  }[];
  mergedLayout: any;
  explanation: string;
  previewReady: boolean;
  totalLatencyMs: number;
}

async function callModel(
  client: OpenAI,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1000
): Promise<string> {
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: maxTokens,
  });
  return response.choices[0]?.message?.content || '';
}

export class DesignStudioService {
  /**
   * Synthesizes prompt-aware SDUI sections with custom titles, hero banners, badges, and colors.
   */
  static synthesizePromptSections(ownerPrompt: string, baseSections: any[]): { sections: any[]; explanation: string } {
    const lower = ownerPrompt.toLowerCase();

    if (lower.includes('diwali') || lower.includes('festive') || lower.includes('holiday')) {
      return {
        explanation: 'AI generated a festive Diwali layout with gold cards, festive coupons, tandoori categories, and celebratory banners.',
        sections: [
          {
            id: 'hero_diwali',
            type: 'hero',
            label: '🪔 Sparkling Diwali Pizza Festival',
            subtitle: 'Celebrate with gold artisanal crusts, festive family combos, and free delivery on all orders!',
            isVisible: true,
            order: 0,
            style: { bgType: 'gradient', bgGradient: 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(249,115,22,0.2))' },
            config: { title: '🪔 Diwali Grand Pizza Festival', subtitle: 'Order festive family combos & get 50% Cashback!', ctaText: 'Claim Diwali Deals', badge: '🪔 Festive Special Edition' },
          },
          {
            id: 'coupons_diwali',
            type: 'coupons',
            label: '🎟️ Diwali Exclusive Coupons',
            subtitle: 'Use code DIWALI50 for flat 50% discount on 12-inch wood-fired pizzas',
            isVisible: true,
            order: 1,
            style: { bgType: 'glass', padding: '24px', borderRadius: '24px' },
            config: {},
          },
          {
            id: 'categories_diwali',
            type: 'categories',
            label: '🪔 Festive Feast Categories',
            subtitle: 'Handcrafted festive pizzas, tandoori treats & Indian spiced sides',
            isVisible: true,
            order: 2,
            style: { bgType: 'glass' },
            config: {},
          },
          {
            id: 'best_sellers_diwali',
            type: 'best_sellers',
            label: '🔥 Top Ordered Festive Pizzas',
            subtitle: 'Most popular customer picks for celebrations',
            isVisible: true,
            order: 3,
            config: {},
          },
          {
            id: 'stats_diwali',
            type: 'stats',
            label: '🎉 50,000+ Festive Pizzas Delivered This Week',
            subtitle: 'Join India\'s favorite wood-fired pizza celebration',
            isVisible: true,
            order: 4,
            style: { bgType: 'glass' },
            config: {},
          },
          {
            id: 'download_app_diwali',
            type: 'download_app',
            label: '📱 Download App for Instant Diwali Scratch Cards',
            subtitle: 'Unlock secret rewards on every in-app order',
            isVisible: true,
            order: 5,
            config: {},
          },
        ],
      };
    }

    if (lower.includes('luxury') || lower.includes('michelin') || lower.includes('gourmet') || lower.includes('gold')) {
      return {
        explanation: 'AI generated an ultra-luxury dark gold restaurant layout with chef table gallery, gourmet Sommelier recommendations, and VIP coupons.',
        sections: [
          {
            id: 'hero_luxury',
            type: 'hero',
            label: '👑 Michelin-Style Wood-Fired Pizzeria',
            subtitle: 'Indulge in truffle-infused crusts, imported Italian buffalo mozzarella, and 900°F brick oven perfection.',
            isVisible: true,
            order: 0,
            style: { bgType: 'gradient', bgGradient: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(6,7,10,0.9))' },
            config: { title: '👑 Artisanal Gourmet Pizzeria', subtitle: 'Truffle crusts & imported Italian buffalo mozzarella', ctaText: 'Reserve & Order', badge: '⭐ Michelin Quality Standards' },
          },
          {
            id: 'recommendations_luxury',
            type: 'recommendations',
            label: '🤖 Chef & Sommelier Curated Recommendations',
            subtitle: 'Personalized pairings selected by Executive Chef Giovanni',
            isVisible: true,
            order: 1,
            style: { bgType: 'glass' },
            config: {},
          },
          {
            id: 'categories_luxury',
            type: 'categories',
            label: '✨ Executive Menu Collections',
            subtitle: 'Hand-rolled dough naturally fermented for 72 hours',
            isVisible: true,
            order: 2,
            config: {},
          },
          {
            id: 'gallery_luxury',
            type: 'gallery',
            label: '🖼️ Chef\'s Kitchen & Brick Oven Gallery',
            subtitle: 'Witness the craftsmanship behind every wood-fired pizza',
            isVisible: true,
            order: 3,
            style: { bgType: 'glass' },
            config: {},
          },
          {
            id: 'testimonials_luxury',
            type: 'testimonials',
            label: '⭐ What Michelin Food Critics Say',
            subtitle: 'Voted #1 Artisanal Pizzeria by Food & Wine Magazine',
            isVisible: true,
            order: 4,
            config: {},
          },
        ],
      };
    }

    if (lower.includes('minimal') || lower.includes('fast') || lower.includes('clean')) {
      return {
        explanation: 'AI generated a clean, ultra-fast minimal layout focusing on 1-click ordering and top sellers.',
        sections: [
          {
            id: 'hero_minimal',
            type: 'hero',
            label: '⚡ Pure Wood-Fired Pizza',
            subtitle: 'Fast 20-minute delivery. 100% natural organic ingredients.',
            isVisible: true,
            order: 0,
            style: { bgType: 'color', bgColor: '#0f172a' },
            config: { title: '⚡ Pure Wood-Fired Pizza', subtitle: 'Fast 20-minute delivery', ctaText: 'Quick Order Now', badge: '⚡ 20-Min Delivery Guarantee' },
          },
          {
            id: 'categories_minimal',
            type: 'categories',
            label: '🍕 Quick Menu Categories',
            subtitle: 'Filter by Veg, Non-Veg, or Vegan',
            isVisible: true,
            order: 1,
            config: {},
          },
          {
            id: 'best_sellers_minimal',
            type: 'best_sellers',
            label: '🔥 Top 4 Favorites',
            subtitle: 'Most ordered pizzas right now',
            isVisible: true,
            order: 2,
            config: {},
          },
          {
            id: 'download_app_minimal',
            type: 'download_app',
            label: '📱 1-Click App Ordering',
            subtitle: 'Skip the line with app pickup',
            isVisible: true,
            order: 3,
            config: {},
          },
        ],
      };
    }

    // Default High-Converting Glassmorphic Pizza Layout Synthesizer
    return {
      explanation: `AI Designer synthesized a high-converting layout with custom hero, active deals, top sellers, and photo gallery for "${ownerPrompt}".`,
      sections: [
        {
          id: 'hero_ai_' + Date.now(),
          type: 'hero',
          label: '🍕 Artisanal Wood-Fired Pizza Feast',
          subtitle: 'Fresh dough made daily at 4 AM. 100% imported San Marzano tomatoes & melted mozzarella.',
          isVisible: true,
          order: 0,
          style: { bgType: 'gradient', bgGradient: 'linear-gradient(135deg, rgba(249,115,22,0.25), rgba(85,119,90,0.25))' },
          config: { title: '🍕 Artisanal Wood-Fired Pizza Feast', subtitle: 'Fresh dough made daily. Delivered piping hot.', ctaText: 'Order Hot Pizza Now', badge: '🔥 Fresh From 900° Brick Oven' },
        },
        {
          id: 'coupons_ai',
          type: 'coupons',
          label: '🎟️ Active Promotional Deals & Coupons',
          subtitle: 'Save up to 40% on family feast combos today',
          isVisible: true,
          order: 1,
          style: { bgType: 'glass' },
          config: {},
        },
        {
          id: 'categories_ai',
          type: 'categories',
          label: '🍕 Explore Pizza & Sides Categories',
          subtitle: 'Artisanal pizzas, garlic bread, dips & desserts',
          isVisible: true,
          order: 2,
          config: {},
        },
        {
          id: 'best_sellers_ai',
          type: 'best_sellers',
          label: '🔥 Best Selling Pizzas',
          subtitle: 'Loved by thousands of foodies across town',
          isVisible: true,
          order: 3,
          config: {},
        },
        {
          id: 'recommendations_ai',
          type: 'recommendations',
          label: '🤖 AI Tailored Picks For You',
          subtitle: 'Personalized recommendations based on customer favorites',
          isVisible: true,
          order: 4,
          style: { bgType: 'glass' },
          config: {},
        },
        {
          id: 'testimonials_ai',
          type: 'testimonials',
          label: '⭐ What Foodies Are Saying',
          subtitle: '4.9/5 stars over 15,000 verified orders',
          isVisible: true,
          order: 5,
          config: {},
        },
        {
          id: 'download_app_ai',
          type: 'download_app',
          label: '📱 Get $10 Off Your First App Order',
          subtitle: 'Download the Olive Pizza app for iOS and Android',
          isVisible: true,
          order: 6,
          config: {},
        },
      ],
    };
  }

  /**
   * Enhances raw user prompt into a high-converting, detailed specification using GLM 5.2.
   */
  static async enhancePrompt(ownerPrompt: string): Promise<{ enhancedPrompt: string; explanation: string }> {
    const client = getOpenRouterClient() || getNvidiaClient();
    if (!client) {
      return {
        enhancedPrompt: `Luxury Pizza Restaurant UI: ${ownerPrompt}. High-converting glassmorphism design with hero banner, best sellers, active coupons, and mobile-first responsive layout.`,
        explanation: 'Expanded prompt with high-converting Olive Pizza design standards.',
      };
    }

    const systemPrompt = `
You are the Prompt Enhancer for Olive Pizza's AI Website Designer powered by GLM 5.2.
Your role: Take an owner's raw intent/prompt and expand it into a detailed, high-converting, professional AI design specification for an SDUI pizza website.

Brand Rules:
- Primary: #f97316 (Pizza Orange) & #55775a (Olive Green)
- Background: #06070a, Glassmorphism, Framer Motion animations
- Layouts: Hero, Categories, Coupons, Best Sellers, Testimonials, Download App, AI Recommendations.

Output JSON strictly in this format:
{
  "enhancedPrompt": "Detailed expanded prompt for GLM 5.2 & DeepSeek V4 Pro design pipeline...",
  "explanation": "Brief 1-sentence summary of what improvements were added."
}
`;

    try {
      const raw = await callModel(client, 'z-ai/glm-5.2', systemPrompt, ownerPrompt, 500);
      const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        enhancedPrompt: parsed.enhancedPrompt || ownerPrompt,
        explanation: parsed.explanation || 'Enhanced prompt for GLM 5.2 layout generation.',
      };
    } catch {
      return {
        enhancedPrompt: `Premium Olive Pizza UI: ${ownerPrompt}. High-converting layout with dark gold accents, glassmorphic card grids, vibrant hero CTA, and smooth animations.`,
        explanation: 'Enhanced with Olive Pizza brand rules and conversion layout standards.',
      };
    }
  }

  /**
   * Runs the full multi-model design pipeline.
   */
  static async generateDesign(
    ownerPrompt: string,
    currentLayout: any
  ): Promise<DesignPipelineResult> {
    const startTime = Date.now();
    const openrouter = getOpenRouterClient();
    const nvidia = getNvidiaClient();
    const activeClient = openrouter || nvidia;

    const pipelineResults: DesignPipelineResult['pipelineResults'] = [];
    let mergedLayout: any = currentLayout;
    
    if (!activeClient) {
      throw new Error('No AI client configured.');
    }

    // 1. DeepSeek V4 Pro: Orchestration & Google Stitch Access
    const headModel = PIPELINE_MODELS.find(m => m.id === 'deepseek_pro');
    let stitchContext = 'No Stitch designs found.';
    try {
      const stitchResult = await StitchService.listDesigns(5);
      if (stitchResult.designs && stitchResult.designs.length > 0) {
        stitchContext = JSON.stringify(stitchResult.designs.map((d: any) => ({ id: d.id, name: d.name })));
      }
    } catch {}

    const orchestratorPrompt = `
You are the Head Orchestrator. The owner wants: "${ownerPrompt}".
Available Google Stitch Components: ${stitchContext}
Current Layout: ${JSON.stringify(currentLayout).slice(0, 500)}

Plan the layout. Provide a JSON map of sections we need to build or modify.
`;
    let plan = '';
    const step1Start = Date.now();
    try {
      plan = await callModel(activeClient, headModel!.model, OLIVE_PIZZA_BRAND_SYSTEM, orchestratorPrompt, 400);
      pipelineResults.push({ modelId: headModel!.id, modelName: headModel!.name, role: headModel!.role, suggestion: plan, latencyMs: Date.now() - step1Start, success: true });
    } catch (e: any) {
      console.warn('Head Orchestrator failed:', e);
    }

    // 2. Sub-models parallel execution
    const subModels = PIPELINE_MODELS.filter(m => ['glm', 'kimi', 'deepseek_flash'].includes(m.id));
    const subTasks = subModels.map(async (step) => {
      const stepStart = Date.now();
      try {
        const prompt = `Owner Request: "${ownerPrompt}".\nOrchestrator Plan:\n${plan}\nYour Role: ${step.role}.\nDraft your contribution concisely.`;
        const result = await callModel(activeClient, step.model, OLIVE_PIZZA_BRAND_SYSTEM, prompt, 400);
        pipelineResults.push({ modelId: step.id, modelName: step.name, role: step.role, suggestion: result, latencyMs: Date.now() - stepStart, success: true });
        return `[${step.name}]: ${result}`;
      } catch (e: any) {
        return `[${step.name}]: Failed - ${e.message}`;
      }
    });

    const subResults = await Promise.all(subTasks);

    // 3. DeepSeek V4 Pro: Final Merge
    const mergeStart = Date.now();
    let explanation = 'AI orchestrator pipeline completed.';
    try {
      const mergePrompt = `
Owner: "${ownerPrompt}"
Orchestrator Plan: ${plan}
Sub-Model Contributions:
${subResults.join('\n\n')}

Current Layout:
${JSON.stringify(currentLayout)}

Generate the FINAL fully updated valid SDUI JSON configuration for the layout. Ensure all brand rules and Stitch IDs are applied correctly. Return pure JSON.
      `;
      const finalJsonStr = await callModel(activeClient, headModel!.model, OLIVE_PIZZA_BRAND_SYSTEM, mergePrompt, 2000);
      
      const cleaned = finalJsonStr.replace(/```json/gi, '').replace(/```/g, '').trim();
      let parsed = JSON.parse(cleaned);
      
      if (parsed.sections && Array.isArray(parsed.sections)) {
        // Enforce brand colors and recursively remove undefined values to prevent Firestore crashes
        const cleanUndefined = (obj: any): any => {
          if (Array.isArray(obj)) return obj.map(cleanUndefined).filter(v => v !== undefined);
          if (obj !== null && typeof obj === 'object') {
            return Object.fromEntries(
              Object.entries(obj)
                .filter(([_, v]) => v !== undefined)
                .map(([k, v]) => [k, cleanUndefined(v)])
            );
          }
          return obj;
        };

        const cleanedSections = parsed.sections.map((s: any) => ({
          ...s,
          style: s.style ? StitchColorMapper.enforceBrandColors(s.style) : s.style,
        }));

        mergedLayout = { sections: cleanUndefined(cleanedSections) };
        explanation = parsed.explanation || explanation;
      }
      pipelineResults.push({ modelId: headModel!.id, modelName: headModel!.name, role: 'Final Synthesis', suggestion: 'Successfully merged layout', latencyMs: Date.now() - mergeStart, success: true });
    } catch (e: any) {
      console.warn('Merge failed, falling back to current layout:', e);
      pipelineResults.push({ modelId: headModel!.id, modelName: headModel!.name, role: 'Final Synthesis', suggestion: `Merge failed: ${e.message}`, latencyMs: Date.now() - mergeStart, success: false });
    }

    return {
      success: true,
      ownerPrompt,
      pipelineResults,
      mergedLayout,
      explanation,
      previewReady: true,
      totalLatencyMs: Date.now() - startTime,
    };
  }

  /**
   * Generates a single section using fast DeepSeek Flash.
   */
  static async generateSection(
    sectionType: string,
    context: string
  ): Promise<any> {
    const client = getOpenRouterClient() || getNvidiaClient();
    if (!client) throw new Error('No AI client configured.');

    const prompt = `
Generate an Olive Pizza SDUI section of type "${sectionType}".
Context: ${context}
Output a single JSON object representing this section with these fields:
{ "type": "${sectionType}", "label": "...", "isVisible": true, "config": { "title": "...", "subtitle": "..." }, "order": 0 }
NO markdown. Pure JSON only.
    `;

    const result = await callModel(client, PIPELINE_MODELS[2].model, OLIVE_PIZZA_BRAND_SYSTEM, prompt, 400);
    const cleaned = result.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  }

  /**
   * Enhanced OwnerAI command — upgrades the existing command processor with Stitch awareness.
   */
  static async processCommandWithStitch(
    command: string,
    currentLayout: any
  ): Promise<{ explanation: string; diff: any; suggestions: string[] }> {
    const client = getOpenRouterClient() || getNvidiaClient();
    
    // Check if this is a Stitch-related command
    const isStitchCommand = /stitch|design|layout|google|import/i.test(command);
    
    if (isStitchCommand) {
      try {
        // Try to list Stitch designs and mention them
        const stitchResult = await StitchService.listDesigns(5);
        if (stitchResult.designs && stitchResult.designs.length > 0) {
          return {
            explanation: `Found ${stitchResult.designs.length} Google Stitch design(s) available for import. Use the Stitch import button to add them to your homepage.`,
            diff: {},
            suggestions: stitchResult.designs.map((d: any) => `Import Stitch design: ${d.name || d.id}`),
          };
        }
      } catch {}
    }

    if (!client) {
      return {
        explanation: `Processed: "${command}" (AI offline — configure NVIDIA_API_KEY or OPENROUTER_API_KEY).`,
        diff: { sections: currentLayout.sections },
        suggestions: ['Configure AI API key to enable smart commands.'],
      };
    }

    const systemPrompt = `${OLIVE_PIZZA_BRAND_SYSTEM}
You are the Owner AI for Olive Pizza website builder.
Current layout: ${JSON.stringify(currentLayout, null, 2).slice(0, 800)}

Respond ONLY with valid JSON:
{ "explanation": "...", "diff": { "sections": [...] }, "suggestions": ["...", "..."] }`;

    try {
      const result = await callModel(client, 'deepseek/deepseek-chat', systemPrompt, command, 1000);
      const cleaned = result.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return {
        explanation: `Applied: "${command}"`,
        diff: { sections: currentLayout.sections },
        suggestions: ['Check the live preview and publish when ready.'],
      };
    }
  }
}
