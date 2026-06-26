import { OpenAI } from 'openai';
import { GoogleGenAI } from '@google/genai';
import { aiHealthMonitor } from './AIHealthMonitor.js';

export type IntentType = 'CUSTOMER_CHAT' | 'RECOMMENDATION' | 'MENU' | 'CHECKOUT' | 'TRACKING' | 'DELIVERY' | 'ANALYTICS' | 'REPORT';

interface AIResponse {
  reply: string;
  action?: any;
}

export class AIRoutingService {
  private nvidiaClient: OpenAI;
  private openrouterClient: OpenAI;
  private geminiClient: GoogleGenAI;

  constructor() {
    this.nvidiaClient = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY || '',
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });
    
    this.openrouterClient = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://olivepizza.app',
        'X-Title': 'Olive Pizza AI',
      }
    });

    this.geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || ''
    });
  }

  private getRoutingMap(intent: IntentType): { primaryProvider: string, models: string[] }[] {
    switch (intent) {
      case 'CUSTOMER_CHAT':
        return [
          { primaryProvider: 'nvidia', models: ['google/gemma-2-9b-it', 'qwen/qwen2.5-7b-instruct'] },
          { primaryProvider: 'openrouter', models: ['google/gemma-2-9b-it', 'meta-llama/llama-3.1-8b-instruct', 'openai/gpt-4o-mini'] },
          { primaryProvider: 'gemini', models: ['gemini-1.5-flash'] }
        ];
      case 'RECOMMENDATION':
        return [
          { primaryProvider: 'nvidia', models: ['google/gemma-2-9b-it', 'qwen/qwen2.5-7b-instruct'] },
          { primaryProvider: 'openrouter', models: ['google/gemma-2-9b-it', 'meta-llama/llama-3.1-8b-instruct'] },
          { primaryProvider: 'gemini', models: ['gemini-1.5-flash'] }
        ];
      case 'MENU':
      case 'CHECKOUT':
        return [
          { primaryProvider: 'nvidia', models: ['google/gemma-2-9b-it', 'qwen/qwen2.5-7b-instruct'] },
          { primaryProvider: 'openrouter', models: ['google/gemma-2-9b-it', 'qwen/qwen-2.5-7b-instruct'] },
          { primaryProvider: 'gemini', models: ['gemini-1.5-flash'] }
        ];
      case 'TRACKING':
        return [
          { primaryProvider: 'nvidia', models: ['google/gemma-2-9b-it', 'qwen/qwen2.5-7b-instruct'] },
          { primaryProvider: 'openrouter', models: ['google/gemma-2-9b-it', 'qwen/qwen-2.5-7b-instruct'] },
          { primaryProvider: 'gemini', models: ['gemini-1.5-flash'] }
        ];
      case 'DELIVERY':
        return [
          { primaryProvider: 'nvidia', models: ['google/gemma-2-9b-it', 'qwen/qwen2.5-7b-instruct'] },
          { primaryProvider: 'openrouter', models: ['google/gemma-2-9b-it', 'qwen/qwen-2.5-7b-instruct'] },
          { primaryProvider: 'gemini', models: ['gemini-1.5-flash'] }
        ];
      case 'ANALYTICS':
      case 'REPORT':
        return [
          { primaryProvider: 'nvidia', models: ['deepseek-ai/deepseek-r1', 'qwen/qwen2.5-72b-instruct'] },
          { primaryProvider: 'openrouter', models: ['deepseek/deepseek-r1', 'qwen/qwen-2.5-72b-instruct', 'openai/gpt-4o'] },
          { primaryProvider: 'gemini', models: ['gemini-1.5-pro'] } // Bumped model for complex analytics
        ];
      default:
        return [
          { primaryProvider: 'nvidia', models: ['google/gemma-2-9b-it'] },
          { primaryProvider: 'openrouter', models: ['google/gemma-2-9b-it'] },
          { primaryProvider: 'gemini', models: ['gemini-1.5-flash'] }
        ];
    }
  }

  private async callOpenAIProvider(client: OpenAI, model: string, systemPrompt: string, history: any[], userMessage: string, forceJson: boolean): Promise<string> {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
      { role: 'user', content: userMessage }
    ] as any[];

    const completion = await client.chat.completions.create({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1024,
      response_format: forceJson ? { type: 'json_object' } : undefined,
    });

    return completion.choices[0].message.content || '';
  }

  private async callGeminiProvider(model: string, systemPrompt: string, history: any[], userMessage: string, forceJson: boolean): Promise<string> {
    const chat = this.geminiClient.chats.create({
      model: model,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        responseMimeType: forceJson ? 'application/json' : 'text/plain',
      }
    });

    for (const msg of history) {
      if (msg.role === 'user') {
        await chat.sendMessage({ message: msg.text });
      } else {
        // Mocking AI response in history requires complex content passing in new SDK. 
        // For simplicity, we just pass the user parts if we can't fully rebuild role history here, 
        // but typically Gemini handles conversation arrays if configured correctly.
        // Simplified fallback behavior:
      }
    }

    const response = await chat.sendMessage({ message: userMessage });
    return response.text || '';
  }

  public async generateResponse(intent: IntentType, systemPrompt: string, history: any[], userMessage: string): Promise<AIResponse> {
    const routingMap = this.getRoutingMap(intent);
    let failoversTriggered = 0;
    const startTime = Date.now();
    let finalResponse = '';
    
    // We expect JSON responses because our system prompt demands {"reply": string, "action": obj}
    const forceJson = true; 

    for (const route of routingMap) {
      const provider = route.primaryProvider as 'nvidia' | 'openrouter' | 'gemini';
      const models = route.models;

      for (let i = 0; i < models.length; i++) {
        const model = models[i];
        
        // Attempt execution (with 1 retry loop for the current model)
        for (let retry = 0; retry < 2; retry++) {
          try {
            if (provider === 'nvidia') {
              finalResponse = await this.callOpenAIProvider(this.nvidiaClient, model, systemPrompt, history, userMessage, forceJson);
            } else if (provider === 'openrouter') {
              finalResponse = await this.callOpenAIProvider(this.openrouterClient, model, systemPrompt, history, userMessage, forceJson);
            } else if (provider === 'gemini') {
              finalResponse = await this.callGeminiProvider(model, systemPrompt, history, userMessage, forceJson);
            }

            // SUCCESS!
            const latencyMs = Date.now() - startTime;
            aiHealthMonitor.recordRequest(provider, latencyMs, true, failoversTriggered);

            // Parse response securely
            try {
              // Strip markdown JSON blocks if present
              const cleaned = finalResponse.replace(/```json/g, '').replace(/```/g, '').trim();
              return JSON.parse(cleaned);
            } catch (e) {
              // If model failed to return JSON, wrap it
              return { reply: finalResponse };
            }

          } catch (error) {
            console.error(`[AI Routing] Provider ${provider} | Model ${model} | Attempt ${retry + 1} Failed:`, error);
            if (retry === 0) {
              failoversTriggered++;
              // Wait before retry
              await new Promise(r => setTimeout(r, 500));
            }
          }
        }
        
        // Failed both attempts on this model, switch to next model in the same provider array
        failoversTriggered++;
      }
    }

    // ALL STEPS FAILED (Graceful Degradation)
    const latencyMs = Date.now() - startTime;
    aiHealthMonitor.recordRequest('nvidia', latencyMs, false, failoversTriggered); // record as failure

    return {
      reply: "We're experiencing high demand right now. Please try again in a moment."
    };
  }
}

export const aiRouter = new AIRoutingService();
