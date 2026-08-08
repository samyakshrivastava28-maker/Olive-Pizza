/**
 * OlivePizzaAISDK.ts — Official SDK Client for Olive Pizza AI Platform
 * 
 * Main Project MUST NOT generate AI responses locally.
 * All AI requests (chat, prompt enhancement, product description, image generation,
 * email template generation, SDUI design generation) are routed through this SDK to Olive Pizza AI.
 */

import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const OLIVE_PIZZA_AI_URL = process.env.OLIVE_PIZZA_AI_URL || 'https://olive-pizza-ai-frontend.vercel.app';
const AI_GATEWAY_SECRET = process.env.AI_GATEWAY_SECRET || 'olive-ai-gateway-secret-change-in-prod';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequestOptions {
  message: string;
  history?: ChatMessage[];
  sessionId?: string;
  userContext?: any;
  authToken?: string;
}

export interface EnhancePromptOptions {
  prompt: string;
  targetType?: 'product' | 'combo' | 'email' | 'ad' | 'sdui';
  context?: any;
}

export interface ProductDescriptionOptions {
  name: string;
  category?: string;
  price?: number;
  ingredients?: string[];
  attributes?: string[];
}

export interface ProductImageOptions {
  prompt: string;
  name?: string;
  category?: string;
}

export interface EmailTemplateOptions {
  prompt: string;
  campaignType?: string;
  targetAudience?: string;
}

export interface SDUIDesignOptions {
  prompt: string;
  screenType?: string;
  currentDraft?: any;
}

export class OlivePizzaAISDK {
  private static getBaseUrl(): string {
    return (process.env.OLIVE_PIZZA_AI_URL || OLIVE_PIZZA_AI_URL).replace(/\/+$/, '');
  }

  private static generateHeaders(bodyPayload: any, authToken?: string): Record<string, string> {
    const timestamp = Date.now().toString();
    const payload = `${timestamp}:${JSON.stringify(bodyPayload || {})}`;
    const signature = crypto.createHmac('sha256', AI_GATEWAY_SECRET).update(payload).digest('hex');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-AI-Signature': signature,
      'X-AI-Timestamp': timestamp,
      'X-Source-System': 'Olive-Pizza-Main',
    };

    if (authToken) {
      headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
    }

    return headers;
  }

  /**
   * Route conversational chat request to Olive Pizza AI
   */
  static async chat(options: ChatRequestOptions): Promise<{ reply: string; source: string; products?: any[] }> {
    try {
      const url = `${this.getBaseUrl()}/api/ai/chat`;
      const headers = this.generateHeaders(options, options.authToken);

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(options),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[OlivePizzaAISDK] Chat request failed (${res.status}): ${errText}`);
        return {
          reply: 'Olive Pizza AI is processing your request. Please try again in a moment. 🍕',
          source: 'olive_pizza_ai_fallback',
        };
      }

      const data = await res.json();
      return {
        reply: data.reply || data.response || 'Thank you for reaching out to Olive Pizza AI.',
        source: data.source || 'olive_pizza_ai',
        products: data.products || [],
      };
    } catch (err: any) {
      console.error('[OlivePizzaAISDK] Chat fetch error:', err.message);
      return {
        reply: 'Olive Pizza AI connection unavailable. Please check your network connection.',
        source: 'sdk_error',
      };
    }
  }

  /**
   * Route prompt enhancement to Olive Pizza AI
   */
  static async enhancePrompt(options: EnhancePromptOptions): Promise<{ enhancedPrompt: string }> {
    try {
      const url = `${this.getBaseUrl()}/api/ai/enhance-prompt`;
      const headers = this.generateHeaders(options);

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(options),
      });

      if (!res.ok) {
        return { enhancedPrompt: options.prompt };
      }

      const data = await res.json();
      return { enhancedPrompt: data.enhancedPrompt || data.prompt || options.prompt };
    } catch (err: any) {
      console.error('[OlivePizzaAISDK] Enhance prompt error:', err.message);
      return { enhancedPrompt: options.prompt };
    }
  }

  /**
   * Route product description generation to Olive Pizza AI
   */
  static async generateProductDescription(options: ProductDescriptionOptions): Promise<{ description: string; highlights: string[] }> {
    try {
      const url = `${this.getBaseUrl()}/api/ai/generate-product-description`;
      const headers = this.generateHeaders(options);

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(options),
      });

      if (!res.ok) {
        return {
          description: `Delicious ${options.name} crafted with fresh ingredients and authentic Olive Pizza recipe.`,
          highlights: ['Fresh Ingredients', 'Handcrafted', 'Hot & Fresh'],
        };
      }

      const data = await res.json();
      return {
        description: data.description || `Delicious ${options.name} prepared fresh at Olive Pizza.`,
        highlights: data.highlights || ['Fresh', 'Authentic Taste'],
      };
    } catch (err: any) {
      console.error('[OlivePizzaAISDK] Product description error:', err.message);
      return {
        description: `Delicious ${options.name} crafted with care at Olive Pizza.`,
        highlights: ['Fresh', 'Delicious'],
      };
    }
  }

  /**
   * Route product image generation to Olive Pizza AI
   */
  static async generateProductImage(options: ProductImageOptions): Promise<{ imageUrl: string }> {
    try {
      const url = `${this.getBaseUrl()}/api/ai/generate-product-image`;
      const headers = this.generateHeaders(options);

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(options),
      });

      if (!res.ok) {
        throw new Error(`AI Service returned status ${res.status}`);
      }

      const data = await res.json();
      return { imageUrl: data.imageUrl || data.url || '' };
    } catch (err: any) {
      console.error('[OlivePizzaAISDK] Product image error:', err.message);
      throw err;
    }
  }

  /**
   * Route email template generation to Olive Pizza AI
   */
  static async generateEmailTemplate(options: EmailTemplateOptions): Promise<{ subject: string; bodyHtml: string; ctaText: string }> {
    try {
      const url = `${this.getBaseUrl()}/api/ai/generate-email`;
      const headers = this.generateHeaders(options);

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(options),
      });

      if (!res.ok) {
        return {
          subject: 'Special Offer from Olive Pizza! 🍕',
          bodyHtml: '<p>Enjoy delicious pizzas handcrafted fresh for you at Olive Pizza!</p>',
          ctaText: 'Order Now',
        };
      }

      const data = await res.json();
      return {
        subject: data.subject || 'Olive Pizza Special Offer',
        bodyHtml: data.bodyHtml || data.html || '<p>Order your favorite pizza now!</p>',
        ctaText: data.ctaText || 'Order Now',
      };
    } catch (err: any) {
      console.error('[OlivePizzaAISDK] Email template error:', err.message);
      return {
        subject: 'Olive Pizza Announcement',
        bodyHtml: '<p>Check out our latest menu and deals!</p>',
        ctaText: 'View Menu',
      };
    }
  }

  /**
   * Route SDUI layout generation to Olive Pizza AI
   */
  static async generateSDUIDesign(options: SDUIDesignOptions): Promise<{ sections: any[]; explanation: string }> {
    try {
      const url = `${this.getBaseUrl()}/api/ai/generate-sdui`;
      const headers = this.generateHeaders(options);

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(options),
      });

      if (!res.ok) {
        return { sections: [], explanation: 'Failed to generate SDUI layout' };
      }

      const data = await res.json();
      return {
        sections: data.sections || [],
        explanation: data.explanation || 'SDUI design generated by Olive Pizza AI',
      };
    } catch (err: any) {
      console.error('[OlivePizzaAISDK] SDUI design error:', err.message);
      return { sections: [], explanation: err.message };
    }
  }

  /**
   * Route owner NL command to Olive Pizza AI
   */
  static async processOwnerCommand(command: string, userId: string, sessionId?: string): Promise<any> {
    try {
      const url = `${this.getBaseUrl()}/api/ai/owner-command`;
      const payload = { command, userId, sessionId };
      const headers = this.generateHeaders(payload);

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        return {
          success: false,
          explanation: 'Olive Pizza AI was unable to process the owner command.',
          diff: {},
          previewReady: false,
          suggestions: [],
          latencyMs: 0,
          modelUsed: 'OlivePizzaAI',
        };
      }

      return await res.json();
    } catch (err: any) {
      console.error('[OlivePizzaAISDK] Owner command error:', err.message);
      return {
        success: false,
        explanation: `SDK Connection Error: ${err.message}`,
        diff: {},
        previewReady: false,
        suggestions: [],
        latencyMs: 0,
        modelUsed: 'OlivePizzaAI',
      };
    }
  }

  /**
   * Check health of Olive Pizza AI connection
   */
  static async getAIHealthStatus(): Promise<{ ok: boolean; platform: string; version: string }> {
    try {
      const url = `${this.getBaseUrl()}/api/ai/health`;
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        return { ok: true, platform: 'Olive Pizza AI Platform', version: data.version || '1.0.0' };
      }
      return { ok: false, platform: 'Olive Pizza AI Platform', version: 'unknown' };
    } catch {
      return { ok: false, platform: 'Olive Pizza AI Platform', version: 'offline' };
    }
  }
}
