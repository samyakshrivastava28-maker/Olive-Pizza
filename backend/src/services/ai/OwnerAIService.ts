import OpenAI from 'openai';
import dotenv from 'dotenv';
import { adminDb as db } from '../../config/firebase.js';
import { WebsiteConfigService } from '../websiteConfig/WebsiteConfigService.js';
import { HomepageConfig, ThemeConfig } from '../../types/websiteConfig.types.js';
import { ReactComponentGenerator } from './ReactComponentGenerator.js';

dotenv.config();

function getAIClient(): OpenAI | null {
  const nvidiaKey = process.env.NVIDIA_API_KEY || process.env.ASSISTANT_NVIDIA_API_KEY;
  if (nvidiaKey && nvidiaKey.trim().length > 10) {
    return new OpenAI({
      apiKey: nvidiaKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
      timeout: 15000,
    });
  }

  const openrouterKey = process.env.OPENROUTER_API_KEY || process.env.ASSISTANT_OPENROUTER_API_KEY;
  if (openrouterKey && openrouterKey.trim().length > 10) {
    return new OpenAI({
      apiKey: openrouterKey,
      baseURL: 'https://openrouter.ai/api/v1',
      timeout: 15000,
    });
  }

  return null;
}

export class OwnerAIService {
  /**
   * Process Natural Language website command from Owner
   */
  static async processOwnerCommand(
    command: string,
    userId: string,
    sessionId = `session_${Date.now()}`
  ): Promise<{
    success: boolean;
    explanation: string;
    diff: any;
    previewReady: boolean;
    suggestions: string[];
    latencyMs: number;
    modelUsed: string;
    componentGenerated?: any; // present if AI decided to generate a React + FM component
  }> {
    const startTime = Date.now();
    const currentDraft = await WebsiteConfigService.getHomepageDraft();
    const currentTheme = await WebsiteConfigService.getTheme();

    const client = getAIClient();
    let modelUsed = 'deepseek-ai/deepseek-r1';
    let explanation = '';
    let diff: any = {};
    let suggestions: string[] = [];

    const systemPrompt = `You are the Senior AI Design Assistant for Olive Pizza restaurant platform.

## Your Capabilities:
1. **SDUI Layout Control** — modify the JSON layout of the homepage in real-time
2. **React + Framer Motion Component Generation** — generate real TSX components with spring animations, scroll-triggered effects, staggered entrances, and hover interactions for the homepage
3. **Google Stitch Layout Import** — when owner mentions Stitch or a design they made in Google Stitch, integrate those layouts as structure and apply Olive Pizza brand colors
4. **Theme control** — change colors, typography, spacing

## When to generate React components:
- Owner says "generate", "create a component", "build", "make a section", "design"
- Owner mentions "animation", "Framer Motion", "React", "spring", "motion"
- Owner wants a brand-new section that doesn't exist yet

## Strict Brand Rules (NEVER VIOLATE):
- Primary: #55775a (Deep Olive Green)
- Secondary: #f97316 (Warm Pizza Orange)  
- Accent: #f59e0b (Premium Gold)
- Background: #0a0a0a — Surface: #121212 — Card: #1e1e1e
- NO blue, purple, pink, cyan, or random colors

## Current Layout:
${JSON.stringify({ sections: currentDraft.sections })}

## Current Theme:
${JSON.stringify(currentTheme)}

## Response format (STRICT — only this JSON, no markdown):
{
  "explanation": "1-2 sentence description of what you did or what to do next",
  "diff": {
    "sections": [...updated sections if changed...],
    "theme": {...if theme changed...}
  },
  "suggestions": ["Quick follow-up action 1", "Quick follow-up action 2"],
  "componentAction": {
    "shouldGenerate": true/false,
    "sectionType": "hero|bestsellers|stats|testimonials|coupons|faq|categories",
    "reason": "Why generating a React component is needed"
  }
}`;


    if (client) {
      try {
        const response = await client.chat.completions.create({
          model: 'deepseek-ai/deepseek-r1',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: command },
          ],
          temperature: 0.2,
          max_tokens: 1500,
        });

        const rawContent = response.choices[0]?.message?.content || '{}';
        const cleaned = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        explanation = parsed.explanation || 'Updated website configuration based on your request.';
        diff = parsed.diff || {};
        suggestions = parsed.suggestions || ['Publish changes when ready', 'Adjust colors if needed'];

        // If AI decided a React + Framer Motion component should be generated
        if (parsed.componentAction?.shouldGenerate) {
          try {
            const sectionType = parsed.componentAction.sectionType || 'hero';
            console.log(`[OwnerAIService] Auto-triggering React component generation for: ${sectionType}`);
            const generatedComponent = await ReactComponentGenerator.generateSection(sectionType, command);
            // Save it to Firestore
            await db.collection('generated_components').add({ userId, ...generatedComponent }).catch(() => {});
            // Pass it back in the response so the frontend can display the code
            (diff as any)._generatedComponent = {
              componentName: generatedComponent.componentName,
              sectionType: generatedComponent.sectionType,
              htmlPreview: generatedComponent.htmlPreview,
              animationsUsed: generatedComponent.animationsUsed,
              description: generatedComponent.description,
              tsxCodePreview: generatedComponent.tsxCode.slice(0, 500) + '\n// ... (download full .tsx from AI Design Studio)',
            };
            explanation = `${explanation} I've also generated a React + Framer Motion component for the ${sectionType} section — check the AI Design Studio → React Generator tab!`;
          } catch (compErr: any) {
            console.warn('[OwnerAIService] Component generation failed:', compErr.message);
          }
        }
      } catch (e: any) {
        console.warn('[OwnerAIService] Primary LLM fallback:', e.message);
        modelUsed = 'rule-based-fallback';
        // Fallback rule parser for common quick commands
        const lower = command.toLowerCase();
        if (lower.includes('dark') || lower.includes('night')) {
          diff = { theme: { mode: 'dark', colors: { ...currentTheme.colors, background: '#0B0F14' } } };
          explanation = 'Switched theme to dark mode with rich black background.';
        } else if (lower.includes('light')) {
          diff = { theme: { mode: 'light', colors: { ...currentTheme.colors, background: '#ffffff', surface: '#f3f4f6', text: '#111827' } } };
          explanation = 'Switched theme to clean light mode.';
        } else if (lower.includes('hide coupons') || lower.includes('remove coupons')) {
          const updated = currentDraft.sections.map(s => s.type === 'coupons' ? { ...s, isVisible: false } : s);
          diff = { sections: updated };
          explanation = 'Hidden the coupons section from the homepage.';
        } else {
          explanation = `Processed command: "${command}". Preview is ready.`;
          diff = { sections: currentDraft.sections };
        }
      }
    } else {
      modelUsed = 'simulated-engine';
      explanation = `Simulated update for: "${command}"`;
      diff = { sections: currentDraft.sections };
    }

    const latencyMs = Date.now() - startTime;

    // Apply the diff to homepage_draft or theme
    if (diff.sections) {
      await WebsiteConfigService.saveHomepageDraft({ sections: diff.sections }, userId);
    }
    if (diff.theme) {
      await WebsiteConfigService.saveTheme(diff.theme, userId);
    }

    // Save session telemetry for Developer Dashboard AI Monitor
    try {
      await db.collection('owner_ai_sessions').add({
        sessionId,
        userId,
        command,
        explanation,
        diff,
        modelUsed,
        latencyMs,
        createdAt: new Date().toISOString(),
      });
    } catch {}

    return {
      success: true,
      explanation,
      diff,
      previewReady: true,
      suggestions,
      latencyMs,
      modelUsed,
    };
  }

  /**
   * Get AI Sessions history for Developer Dashboard AI Monitor
   */
  static async getAISessionHistory(limitCount = 50): Promise<any[]> {
    try {
      const snap = await db
        .collection('owner_ai_sessions')
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get();
      return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      return [];
    }
  }
}
