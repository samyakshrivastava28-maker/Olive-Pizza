/**
 * SubAgentService.ts
 * Manages the 5 specialized sub-models for the Section Designer pipeline.
 * Each model has a precise role and tuned system prompt.
 */

import OpenAI from 'openai';
import { AgentStreamService } from './AgentStreamService.js';

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

function getNvidiaClient(): OpenAI {
  const key = process.env.NVIDIA_API_KEY || process.env.ASSISTANT_NVIDIA_API_KEY || '';
  return new OpenAI({ apiKey: key, baseURL: NVIDIA_BASE_URL, timeout: 45000 });
}

function getOpenRouterClient(): OpenAI {
  const key = process.env.OPENROUTER_API_KEY || '';
  return new OpenAI({
    apiKey: key,
    baseURL: OPENROUTER_BASE_URL,
    timeout: 45000,
    defaultHeaders: {
      'HTTP-Referer': 'https://olivepizza.app',
      'X-Title': 'Olive Pizza Section Designer',
    },
  });
}

const OLIVE_BRAND_CONTEXT = `
Olive Pizza Brand Rules:
- PRIMARY: #f97316 (Orange)
- BACKGROUND: #0B0F14, SURFACE: #111827
- TEXT: #f9fafb, BORDER: rgba(255,255,255,0.1)
- Glassmorphism: backdrop-filter blur-12px on cards
- Font: Inter
- Mobile first (320px), full responsive to 1440px
- Framer Motion for all animations
`;

const SUB_AGENT_CONFIGS: Record<string, { model: string; provider: 'nvidia' | 'openrouter'; system: string; maxTokens: number; temperature: number }> = {
  'glm-5.2': {
    model: 'z-ai/glm-5.2',
    provider: 'nvidia',
    maxTokens: 2000,
    temperature: 0.3,
    system: `You are a JSON layout architect for Olive Pizza.
Your ONLY job: build the structural layout JSON for a UI section.
Output ONLY valid JSON. No explanation. No markdown.
Follow the Olive Pizza SDUI section schema:
{ "id": string, "type": string, "isVisible": true, "order": number, "label": string, "config": { ...section-specific data } }
Use Tailwind CSS class names for layout (grid, flex, gap, padding). Mobile-first.
${OLIVE_BRAND_CONTEXT}`,
  },
  'kimi-2.6': {
    model: 'moonshotai/kimi-k2',
    provider: 'nvidia',
    maxTokens: 800,
    temperature: 0.8,
    system: `You are a conversion-focused UX copywriter for Olive Pizza, a premium vegetarian pizza restaurant.
Write headlines, subheadlines, CTA text, and supporting copy that is warm, appetizing, and action-oriented.
Output ONLY a JSON object: { "headline": string, "subheadline": string, "ctaText": string, "supporting": string }
No explanation. Pure JSON only.`,
  },
  'deepseek-flash': {
    model: 'deepseek-ai/deepseek-v3-0324',
    provider: 'nvidia',
    maxTokens: 1000,
    temperature: 0.3,
    system: `You are a UI component block generator for Olive Pizza.
Given a section type and config, generate standard UI blocks: buttons, badges, tags, dividers, spacers, icon elements.
Output ONLY a valid JSON array of component block objects.
Each block: { "type": string, "config": object, "className": string }
No explanation. Pure JSON array only.`,
  },
  'nemotron-ultra': {
    model: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',
    provider: 'nvidia',
    maxTokens: 600,
    temperature: 0.2,
    system: `You are a design system enforcer and accessibility expert for Olive Pizza.
Given a section layout, output the final design rules.
Output ONLY valid JSON:
{
  "spacing": object,
  "breakpoints": object,
  "aria": object,
  "minTouchTarget": "44px",
  "fontScale": object,
  "contrastRatios": object
}
Follow WCAG 2.1 AA standards. Pure JSON only.`,
  },
  'minimax-m3': {
    model: 'minimax/minimax-m3',
    provider: 'openrouter',
    maxTokens: 400,
    temperature: 0.4,
    system: `You are a Framer Motion animation specialist for Olive Pizza.
Generate animation config for a UI section entry animation.
Output ONLY valid JSON:
{
  "initial": { "opacity": number, "y": number, "scale": number },
  "animate": { "opacity": number, "y": number, "scale": number },
  "transition": { "duration": number, "ease": string, "staggerChildren": number, "delayChildren": number }
}
Use only GPU-accelerated properties. Never animate layout properties.`,
  },
};

export class SubAgentService {
  /**
   * Run all sub-agent tasks in parallel.
   */
  static async runAllParallel(
    sessionId: string,
    tasks: Array<{ model: string; task: string }>,
    abortController: AbortController
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    const nvidia = getNvidiaClient();
    const openrouter = getOpenRouterClient();

    await Promise.allSettled(tasks.map(async ({ model, task }) => {
      const config = SUB_AGENT_CONFIGS[model];
      if (!config) return;

      if (abortController.signal.aborted) return;

      AgentStreamService.emit(sessionId, {
        type: 'subagent_started',
        sessionId,
        timestamp: new Date().toISOString(),
        model: config.model,
        task,
        message: `🔵 ${model} — ${task}`,
      });

      try {
        const client = config.provider === 'openrouter' ? openrouter : nvidia;
        const response = await client.chat.completions.create({
          model: config.model,
          messages: [
            { role: 'system', content: config.system },
            { role: 'user', content: task },
          ],
          max_tokens: config.maxTokens,
          temperature: config.temperature,
        });

        const text = response.choices[0]?.message?.content || '{}';
        const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        
        let parsed: any;
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          parsed = { rawText: cleaned };
        }

        results[model] = parsed;

        AgentStreamService.emit(sessionId, {
          type: 'subagent_done',
          sessionId,
          timestamp: new Date().toISOString(),
          model: config.model,
          message: `✅ ${model} — Complete`,
          data: { model, success: true },
        });
      } catch (err: any) {
        console.error(`[SubAgent] ${model} failed:`, err.message);
        results[model] = null;

        AgentStreamService.emit(sessionId, {
          type: 'subagent_failed',
          sessionId,
          timestamp: new Date().toISOString(),
          model: config.model,
          message: `❌ ${model} — Failed: ${err.message}`,
          data: { model, error: err.message },
        });

        // Try fallback
        const fallback = await this.tryFallback(model, task, nvidia, openrouter);
        if (fallback) {
          results[model] = fallback;
          AgentStreamService.emit(sessionId, {
            type: 'subagent_done',
            sessionId,
            timestamp: new Date().toISOString(),
            model: config.model,
            message: `✅ ${model} — Recovered via fallback`,
            data: { model, fallback: true },
          });
        }
      }
    }));

    return results;
  }

  private static async tryFallback(
    failedModel: string,
    task: string,
    nvidia: OpenAI,
    openrouter: OpenAI
  ): Promise<any> {
    const fallbackMap: Record<string, string> = {
      'glm-5.2': 'deepseek-flash',
      'kimi-2.6': 'minimax-m3',
      'nemotron-ultra': 'glm-5.2',
      'minimax-m3': 'kimi-2.6',
    };

    const fallbackKey = fallbackMap[failedModel];
    if (!fallbackKey) return null;

    const config = SUB_AGENT_CONFIGS[fallbackKey];
    if (!config) return null;

    try {
      const client = config.provider === 'openrouter' ? openrouter : nvidia;
      const response = await client.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: config.system },
          { role: 'user', content: task },
        ],
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      });
      const text = response.choices[0]?.message?.content || '{}';
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}
