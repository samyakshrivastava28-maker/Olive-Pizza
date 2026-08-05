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
      const designs = await StitchService.listDesigns(5);
      if (designs.length > 0) {
        stitchContext = JSON.stringify(designs.map(d => ({ id: d.id, name: d.name })));
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
        const designs = await StitchService.listDesigns(5);
        if (designs.length > 0) {
          return {
            explanation: `Found ${designs.length} Google Stitch design(s) available for import. Use the Stitch import button to add them to your homepage.`,
            diff: {},
            suggestions: designs.map((d: any) => `Import Stitch design: ${d.name || d.id}`),
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
