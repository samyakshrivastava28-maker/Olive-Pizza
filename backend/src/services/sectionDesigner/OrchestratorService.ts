/**
 * OrchestratorService.ts
 * DeepSeek V4 Pro acting as the Head Model — orchestrates the entire pipeline.
 */

import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { adminDb } from '../../config/firebase.js';
import { AgentStreamService } from './AgentStreamService.js';
import { SubAgentService } from './SubAgentService.js';
import { ImagePipelineService } from './ImagePipelineService.js';
import { SDUIValidator } from './SDUIValidator.js';
import { StitchService } from '../stitch/StitchService.js';
import { OrchestratorPlan, DesignSession, AgentQuestion } from '../../types/sectionDesigner.types.js';

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const HEAD_MODEL = 'deepseek-ai/deepseek-v4-pro';
const FALLBACK_HEAD_MODEL = 'deepseek-ai/deepseek-r1';

// In-memory session state (sessionId → { plan, pendingQuestion, abortController, answers })
const activeSessions = new Map<string, {
  plan: OrchestratorPlan | null;
  pendingQuestion: AgentQuestion | null;
  abortController: AbortController;
  answers: Record<string, string | string[]>;
  questionResolvers: Map<string, (answer: string | string[]) => void>;
}>();

function getClient(): OpenAI {
  const key = process.env.NVIDIA_API_KEY || process.env.ASSISTANT_NVIDIA_API_KEY || '';
  return new OpenAI({ apiKey: key, baseURL: NVIDIA_BASE_URL, timeout: 60000 });
}

const SYSTEM_PROMPT = `You are the Head Orchestrator for Olive Pizza's Section Designer.
You manage a team of specialized AI sub-agents to build premium, mobile-first UI sections.

BRAND RULES (non-negotiable):
- Colors ONLY: #f97316, #fb923c, #0B0F14, #111827, #f9fafb, rgba(255,255,255,0.1), #55775a
- Font: Inter
- Glassmorphism: backdrop-filter: blur(12px) on cards
- Framer Motion animations (spring physics, no layout animations)
- Mobile-first, responsive from 320px to 1440px
- All images: Cloudinary CDN URLs only

Your output must be a structured JSON plan. No markdown. No explanation. Pure JSON only.`;

export class OrchestratorService {
  static async startSession(params: {
    sessionId: string;
    ownerId: string;
    prompt: string;
    referenceImages?: string[];
  }): Promise<void> {
    const { sessionId, ownerId, prompt, referenceImages } = params;
    const abortController = new AbortController();

    activeSessions.set(sessionId, {
      plan: null,
      pendingQuestion: null,
      abortController,
      answers: {},
      questionResolvers: new Map(),
    });

    // Persist session to Firestore
    const session: DesignSession = {
      sessionId,
      ownerId,
      status: 'planning',
      prompt,
      referenceImageUrls: referenceImages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await adminDb.collection('section_designer_sessions').doc(sessionId).set(session);

    // Start the full pipeline (non-blocking)
    this.runPipeline({ sessionId, ownerId, prompt, referenceImages, abortController }).catch(err => {
      console.error(`[Orchestrator] Fatal error in session ${sessionId}:`, err);
      AgentStreamService.emit(sessionId, {
        type: 'error',
        sessionId,
        timestamp: new Date().toISOString(),
        message: `Fatal error: ${err.message}`,
      });
    });
  }

  private static async runPipeline(params: {
    sessionId: string;
    ownerId: string;
    prompt: string;
    referenceImages?: string[];
    abortController: AbortController;
  }): Promise<void> {
    const { sessionId, ownerId, prompt, referenceImages, abortController } = params;
    const session = activeSessions.get(sessionId)!;

    try {
      AgentStreamService.emit(sessionId, {
        type: 'session_started',
        sessionId,
        timestamp: new Date().toISOString(),
        message: '🍕 Session started — DeepSeek V4 Pro is analyzing your request...',
      });

      // PHASE 1: Planning
      AgentStreamService.emit(sessionId, {
        type: 'planning',
        sessionId,
        timestamp: new Date().toISOString(),
        model: HEAD_MODEL,
        message: '🔵 DeepSeek V4 Pro — Reading your request and planning...',
      });

      const plan = await this.createPlan(prompt, referenceImages, abortController);
      session.plan = plan;

      await adminDb.collection('section_designer_sessions').doc(sessionId).update({
        plan, status: 'questioning', updatedAt: new Date().toISOString(),
      });

      // PHASE 2: Ask clarifying questions
      if (plan.questionsForOwner?.length > 0) {
        for (const question of plan.questionsForOwner) {
          if (abortController.signal.aborted) break;
          
          session.pendingQuestion = question;

          AgentStreamService.emit(sessionId, {
            type: 'question',
            sessionId,
            timestamp: new Date().toISOString(),
            message: question.question,
            data: { question },
          });

          // Wait for owner to answer
          const answer = await this.waitForAnswer(sessionId, question.id, abortController);
          session.answers[question.id] = answer;

          AgentStreamService.emit(sessionId, {
            type: 'question_answered',
            sessionId,
            timestamp: new Date().toISOString(),
            message: `✅ Got it! Proceeding with: "${Array.isArray(answer) ? answer.join(', ') : answer}"`,
            data: { questionId: question.id, answer },
          });
        }
      }

      if (abortController.signal.aborted) {
        await this.handleCancellation(sessionId);
        return;
      }

      // PHASE 3: Fetch Stitch components
      AgentStreamService.emit(sessionId, {
        type: 'stitch_fetching',
        sessionId,
        timestamp: new Date().toISOString(),
        model: 'Google Stitch',
        message: '🔵 Google Stitch — Fetching component registry...',
      });

      let stitchComponents: any[] = [];
      try {
        stitchComponents = await StitchService.listDesigns(5);
        if (plan.stitchComponentId) {
          const stitchDetail = stitchComponents.find((d: any) => d.id === plan.stitchComponentId) || stitchComponents[0];
          if (stitchDetail) {
            AgentStreamService.emit(sessionId, {
              type: 'stitch_selected',
              sessionId,
              timestamp: new Date().toISOString(),
              model: 'Google Stitch',
              message: `✅ Using layout: ${stitchDetail.name}`,
              data: { design: stitchDetail },
            });
          }
        }
      } catch (err: any) {
        console.warn('[Orchestrator] Stitch unavailable, continuing without it:', err.message);
      }

      await adminDb.collection('section_designer_sessions').doc(sessionId).update({
        status: 'working', updatedAt: new Date().toISOString(),
      });

      // PHASE 4: Parallel sub-agent dispatch + image pipeline
      const [subAgentOutputs, imageUrls] = await Promise.all([
        SubAgentService.runAllParallel(sessionId, plan.tasksForSubAgents, abortController),
        ImagePipelineService.processImageNeeds(sessionId, plan.imageNeeds || [], abortController),
      ]);

      if (abortController.signal.aborted) {
        await this.handleCancellation(sessionId);
        return;
      }

      // PHASE 5: Final synthesis
      AgentStreamService.emit(sessionId, {
        type: 'synthesizing',
        sessionId,
        timestamp: new Date().toISOString(),
        model: HEAD_MODEL,
        message: '🔵 DeepSeek V4 Pro — Merging all outputs into final SDUI JSON...',
      });

      await adminDb.collection('section_designer_sessions').doc(sessionId).update({
        status: 'synthesizing', updatedAt: new Date().toISOString(),
      });

      let finalJSON = await this.synthesize({
        prompt,
        plan,
        answers: session.answers,
        subAgentOutputs,
        imageUrls,
        stitchComponents,
        abortController,
      });

      // PHASE 6: Validate
      AgentStreamService.emit(sessionId, {
        type: 'validating',
        sessionId,
        timestamp: new Date().toISOString(),
        model: 'SDUIValidator',
        message: '🔵 Validator — Checking schema and brand compliance...',
      });

      let maxFixes = 3;
      let { valid, errors } = SDUIValidator.validate(finalJSON);

      while (!valid && maxFixes > 0) {
        maxFixes--;

        AgentStreamService.emit(sessionId, {
          type: 'validation_error',
          sessionId,
          timestamp: new Date().toISOString(),
          message: `⚠️ Validator found ${errors.length} issue(s). Auto-fixing...`,
          data: { errors },
        });

        finalJSON = await this.autoFix(finalJSON, errors, abortController);
        const result = SDUIValidator.validate(finalJSON);
        valid = result.valid;
        errors = result.errors;

        if (valid) {
          AgentStreamService.emit(sessionId, {
            type: 'validation_fixed',
            sessionId,
            timestamp: new Date().toISOString(),
            message: '✅ Validator — Issues resolved automatically',
          });
        }
      }

      // Clean undefined values before Firestore write
      const cleanedJSON = SDUIValidator.cleanUndefined(finalJSON);

      // Save draft to Firestore
      await adminDb.collection('website_config').doc('homepage_draft').set({
        ...cleanedJSON,
        updatedAt: new Date().toISOString(),
        generatedBy: 'section-designer-ai',
        sessionId,
        ownerId,
      });

      await adminDb.collection('section_designer_sessions').doc(sessionId).update({
        status: 'done',
        finalJSON: cleanedJSON,
        validationErrors: errors,
        updatedAt: new Date().toISOString(),
      });

      // Emit file_generated with the JSON content
      AgentStreamService.emit(sessionId, {
        type: 'file_generated',
        sessionId,
        timestamp: new Date().toISOString(),
        message: '📄 section.json generated',
        data: {
          files: [{
            name: 'section.json',
            path: 'website_config/homepage_draft',
            content: JSON.stringify(cleanedJSON, null, 2),
            language: 'json',
            hasErrors: !valid,
            errors,
          }],
        },
      });

      AgentStreamService.emit(sessionId, {
        type: 'draft_saved',
        sessionId,
        timestamp: new Date().toISOString(),
        message: '✅ Draft saved to Firestore',
      });

      AgentStreamService.emit(sessionId, {
        type: 'preview_ready',
        sessionId,
        timestamp: new Date().toISOString(),
        message: '✅ Section complete! Check the Live Preview →',
        data: { json: cleanedJSON },
      });

      AgentStreamService.emit(sessionId, {
        type: 'done',
        sessionId,
        timestamp: new Date().toISOString(),
        message: '🎉 Section Designer pipeline complete!',
      });

    } catch (err: any) {
      if (abortController.signal.aborted) {
        await this.handleCancellation(sessionId);
      } else {
        console.error(`[Orchestrator] Pipeline error:`, err);
        await adminDb.collection('section_designer_sessions').doc(sessionId).update({
          status: 'error', updatedAt: new Date().toISOString(),
        });
        AgentStreamService.emit(sessionId, {
          type: 'error',
          sessionId,
          timestamp: new Date().toISOString(),
          message: `Error: ${err.message || 'Unknown error occurred'}`,
        });
      }
    } finally {
      activeSessions.delete(sessionId);
      AgentStreamService.close(sessionId);
    }
  }

  private static async createPlan(
    prompt: string,
    referenceImages?: string[],
    abortController?: AbortController
  ): Promise<OrchestratorPlan> {
    const client = getClient();

    const userContent: any[] = [
      { type: 'text', text: `Create a detailed orchestration plan for this UI section request:\n"${prompt}"\n\nAvailable sub-agents: glm-5.2 (structure), kimi-2.6 (copy), deepseek-flash (components), nemotron-ultra (design rules), minimax-m3 (animations).\n\nReturn ONLY valid JSON matching OrchestratorPlan schema.` },
    ];

    if (referenceImages?.length) {
      referenceImages.slice(0, 3).forEach(img => {
        userContent.push({ type: 'image_url', image_url: { url: img } });
      });
    }

    try {
      const response = await client.chat.completions.create({
        model: HEAD_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      });

      const text = response.choices[0]?.message?.content || '';
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (err: any) {
      // Fallback plan if planning fails
      return {
        sectionType: 'custom',
        tasksForSubAgents: [
          { model: 'glm-5.2', task: `Build a JSON layout for: "${prompt}"` },
          { model: 'kimi-2.6', task: `Write engaging marketing copy for: "${prompt}"` },
          { model: 'deepseek-flash', task: `Generate UI component blocks for: "${prompt}"` },
        ],
        imageNeeds: [{ purpose: 'hero background', description: `Dark, premium background image for: "${prompt}"` }],
        questionsForOwner: [],
      };
    }
  }

  private static waitForAnswer(
    sessionId: string,
    questionId: string,
    abortController: AbortController
  ): Promise<string | string[]> {
    return new Promise((resolve, reject) => {
      const session = activeSessions.get(sessionId);
      if (!session) { reject(new Error('Session not found')); return; }

      const timeoutMs = 5 * 60 * 1000; // 5 min timeout
      const timer = setTimeout(() => {
        resolve('No answer provided — using default.');
      }, timeoutMs);

      abortController.signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Session cancelled'));
      });

      session.questionResolvers.set(questionId, (answer) => {
        clearTimeout(timer);
        resolve(answer);
      });
    });
  }

  static answerQuestion(sessionId: string, questionId: string, answer: string | string[]): boolean {
    const session = activeSessions.get(sessionId);
    if (!session) return false;
    const resolver = session.questionResolvers.get(questionId);
    if (!resolver) return false;
    resolver(answer);
    session.questionResolvers.delete(questionId);
    session.pendingQuestion = null;
    return true;
  }

  static cancelSession(sessionId: string): void {
    const session = activeSessions.get(sessionId);
    if (session) {
      session.abortController.abort();
    }
  }

  private static async handleCancellation(sessionId: string): Promise<void> {
    await adminDb.collection('section_designer_sessions').doc(sessionId).update({
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    AgentStreamService.emit(sessionId, {
      type: 'cancelled',
      sessionId,
      timestamp: new Date().toISOString(),
      message: '⛔ Session cancelled by owner. You can start a new request.',
    });
  }

  private static async synthesize(params: {
    prompt: string;
    plan: OrchestratorPlan;
    answers: Record<string, string | string[]>;
    subAgentOutputs: Record<string, any>;
    imageUrls: Record<string, string>;
    stitchComponents: any[];
    abortController: AbortController;
  }): Promise<any> {
    const { prompt, plan, answers, subAgentOutputs, imageUrls, stitchComponents } = params;
    const client = getClient();

    const answersText = Object.entries(answers).map(([q, a]) => `Q: ${q} → A: ${JSON.stringify(a)}`).join('\n');
    const imagesText = Object.entries(imageUrls).map(([purpose, url]) => `${purpose}: ${url}`).join('\n');

    const mergePrompt = `
Owner request: "${prompt}"
Owner answers: ${answersText || 'None'}

Sub-agent outputs:
GLM 5.2 (structure): ${JSON.stringify(subAgentOutputs['glm-5.2'])?.slice(0, 600) || 'unavailable'}
Kimi 2.6 (copy): ${JSON.stringify(subAgentOutputs['kimi-2.6'])?.slice(0, 400) || 'unavailable'}
DeepSeek Flash (components): ${JSON.stringify(subAgentOutputs['deepseek-flash'])?.slice(0, 400) || 'unavailable'}
Nemotron Ultra (design rules): ${JSON.stringify(subAgentOutputs['nemotron-ultra'])?.slice(0, 300) || 'unavailable'}
MiniMax M3 (animations): ${JSON.stringify(subAgentOutputs['minimax-m3'])?.slice(0, 300) || 'unavailable'}

Cloudinary image URLs: ${imagesText || 'none — use CSS gradients'}

Merge all into a single valid SDUI JSON section object with this structure:
{
  "id": "string",
  "type": "string",
  "isVisible": true,
  "order": 0,
  "label": "string",
  "config": { ...all config here, including backgroundImage from Cloudinary, headline, ctaText, components, etc. },
  "style": { ...brand-compliant styles },
  "animation": { ...framer motion config }
}

Return PURE JSON only. No markdown. No explanation.`;

    const response = await client.chat.completions.create({
      model: HEAD_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: mergePrompt },
      ],
      max_tokens: 2500,
      temperature: 0.2,
    });

    const text = response.choices[0]?.message?.content || '';
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    try {
      return JSON.parse(cleaned);
    } catch {
      // Wrap in sections array as fallback
      return {
        id: `section-${Date.now()}`,
        type: plan.sectionType || 'custom',
        isVisible: true,
        order: 0,
        label: prompt.slice(0, 50),
        config: { rawOutput: cleaned },
      };
    }
  }

  private static async autoFix(json: any, errors: string[], abortController: AbortController): Promise<any> {
    const client = getClient();

    const fixPrompt = `Fix these validation errors in this SDUI JSON:
Errors: ${errors.join('; ')}
Current JSON: ${JSON.stringify(json, null, 2).slice(0, 2000)}

Return the corrected JSON only. Pure JSON. No markdown.`;

    try {
      const response = await client.chat.completions.create({
        model: HEAD_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: fixPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      });

      const text = response.choices[0]?.message?.content || '';
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return json;
    }
  }
}
