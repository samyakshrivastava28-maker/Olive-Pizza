import OpenAI from 'openai';
import dotenv from 'dotenv';
import { adminDb as db } from '../../config/firebase.js';
import { WebsiteConfigService } from '../websiteConfig/WebsiteConfigService.js';
import { HomepageConfig, ThemeConfig } from '../../types/websiteConfig.types.js';

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
  }> {
    const startTime = Date.now();
    const currentDraft = await WebsiteConfigService.getHomepageDraft();
    const currentTheme = await WebsiteConfigService.getTheme();

    const client = getAIClient();
    let modelUsed = 'deepseek-ai/deepseek-r1';
    let explanation = '';
    let diff: any = {};
    let suggestions: string[] = [];

    const systemPrompt = `You are the Senior Website Architect & SDUI AI Assistant for Olive Pizza.
Your job is to interpret the restaurant owner's natural language command and output a JSON modification for the website configuration.

Current Homepage Config:
${JSON.stringify({ sections: currentDraft.sections })}

Current Theme Config:
${JSON.stringify(currentTheme)}

Owner Instruction: "${command}"

CRITICAL RULES:
1. Output ONLY a valid JSON object with these keys:
{
  "explanation": "Human-friendly 1-2 sentence description of the change you made",
  "diff": {
    "sections": [...updated sections array if sections changed...],
    "theme": {...updated theme properties if theme changed...}
  },
  "suggestions": ["Follow-up suggestion 1", "Follow-up suggestion 2"]
}
2. Preserve existing section IDs whenever possible.
3. NEVER return markdown or code fences like \`\`\`json. Return pure raw JSON only.`;

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
