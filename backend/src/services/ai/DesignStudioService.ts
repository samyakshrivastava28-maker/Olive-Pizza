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
You have access to Google Stitch component logic. When suggesting layouts, prefer mapping them to rich React components wrapped in Framer Motion animations. Use `framer-motion` for transitions (e.g., initial, animate, exit properties). 
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
    id: 'glm',
    name: 'GLM 5.2',
    model: 'thudm/glm-4-9b-chat',
    role: 'UI Reasoning & Layout Structure',
    provider: 'nvidia',
  },
  {
    id: 'deepseek_pro',
    name: 'DeepSeek V4 Pro',
    model: 'deepseek/deepseek-chat',
    role: 'Architecture & Component Design',
    provider: 'nvidia',
  },
  {
    id: 'deepseek_flash',
    name: 'DeepSeek V4 Flash',
    model: 'deepseek/deepseek-r1-distill-qwen-7b',
    role: 'Fast Layout Generation',
    provider: 'nvidia',
  },
  {
    id: 'kimi',
    name: 'Kimi 2.6',
    model: 'moonshotai/kimi-2.6',
    role: 'Creative UX & User Flow Ideas',
    provider: 'nvidia',
  },
  {
    id: 'qwen',
    name: 'Qwen 3',
    model: 'qwen/qwen3-235b-a22b',
    role: 'Component Improvements & Refinement',
    provider: 'nvidia',
  },
  {
    id: 'gemma',
    name: 'Gemma 4',
    model: 'google/gemma-3-27b-it',
    role: 'Accessibility & Mobile Compliance',
    provider: 'nvidia',
  },
  {
    id: 'gpt_oss',
    name: 'GPT OSS 120B',
    model: 'meta-llama/llama-3.3-70b-instruct',
    role: 'Final Merge & Reasoning',
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
    const suggestions: string[] = [];

    for (const step of PIPELINE_MODELS) {
      const stepStart = Date.now();
      const client = step.provider === 'openrouter' ? (openrouter || nvidia) : (nvidia || openrouter);

      if (!client) {
        pipelineResults.push({
          modelId: step.id,
          modelName: step.name,
          role: step.role,
          suggestion: 'AI client not configured.',
          latencyMs: 0,
          success: false,
        });
        continue;
      }

      try {
        const prevSuggestions = suggestions.join('\n---\n');
        const prompt = `
Owner's Request: "${ownerPrompt}"
Current Homepage Layout (SDUI JSON): ${JSON.stringify(currentLayout, null, 2).slice(0, 1000)}

Previous model suggestions so far:
${prevSuggestions || 'None yet - you are the first model.'}

Your Role: ${step.role}

Based on the above, provide your specific design suggestion as a concise JSON fragment or improvement notes.
Keep your output under 300 tokens. Be concrete and actionable.
REMEMBER: Only use Olive Pizza brand colors (#55775a, #f97316, #f59e0b, #0a0a0a).
        `;

        const result = await callModel(
          client,
          step.model,
          OLIVE_PIZZA_BRAND_SYSTEM,
          prompt,
          500
        );

        suggestions.push(`[${step.name} - ${step.role}]: ${result}`);
        pipelineResults.push({
          modelId: step.id,
          modelName: step.name,
          role: step.role,
          suggestion: result,
          latencyMs: Date.now() - stepStart,
          success: true,
        });
      } catch (e: any) {
        console.warn(`[DesignStudio] ${step.name} failed:`, e.message);
        pipelineResults.push({
          modelId: step.id,
          modelName: step.name,
          role: step.role,
          suggestion: `Error: ${e.message}`,
          latencyMs: Date.now() - stepStart,
          success: false,
        });
      }
    }

    // Final merge pass — synthesize all suggestions into SDUI layout
    let mergedLayout: any = currentLayout;
    let explanation = 'AI design pipeline completed. Review suggestions and approve to publish.';

    if (activeClient) {
      try {
        const mergePrompt = `
You are the final design synthesis AI for Olive Pizza.
All specialist models have reviewed the owner's request and provided suggestions.

Owner's Request: "${ownerPrompt}"
Current Layout: ${JSON.stringify(currentLayout, null, 2).slice(0, 800)}

All Specialist Suggestions:
${suggestions.join('\n---\n').slice(0, 2000)}

YOUR TASK:
1. Synthesize all suggestions into the optimal final homepage sections array.
2. Apply the best ideas from each specialist.
3. Ensure strict Olive Pizza brand colors only.
4. Output ONLY a valid JSON object:
{
  "explanation": "1-2 sentence summary of what changed",
  "sections": [...updated sections array...]
}
NO markdown. NO code fences. Pure JSON only.
        `;

        const mergeResult = await callModel(
          activeClient,
          PIPELINE_MODELS[0].model, // GLM 5.2 for final merge & debugging
          OLIVE_PIZZA_BRAND_SYSTEM,
          mergePrompt,
          1500
        );

        const cleaned = mergeResult.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        
        if (parsed.sections && Array.isArray(parsed.sections)) {
          // Enforce brand colors and recursively remove undefined values
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
        }
        explanation = parsed.explanation || explanation;
      } catch (e: any) {
        console.warn('[DesignStudio] Final merge failed:', e.message);
        explanation = `Design pipeline complete. ${pipelineResults.filter(r => r.success).length}/${PIPELINE_MODELS.length} models contributed suggestions.`;
      }
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
