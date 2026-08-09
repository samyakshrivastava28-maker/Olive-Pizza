import dotenv from 'dotenv';
import { StitchService, StitchTelemetry } from '../stitch/StitchService.js';
import { StitchColorMapper } from '../stitch/StitchColorMapper.js';
import { OlivePizzaAISDK } from '../OlivePizzaAISDK.js';

dotenv.config();

export interface DesignPipelineResult {
  success: boolean;
  ownerPrompt: string;
  enhancedPrompt?: string;
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
  telemetry?: StitchTelemetry;
  fallbackStatus: 'Disabled';
  designReasoning?: string;
  designAdvice?: string;
  safetyReview?: any;
}

export class DesignStudioService {
  static async generateDesign(ownerPrompt: string, _currentDraft: any = []): Promise<DesignPipelineResult> {
    return this.runMultiModelStitchPipeline(ownerPrompt);
  }
  static async generateSection(_sectionType: string, ownerPrompt: string): Promise<any> {
    return this.runMultiModelStitchPipeline(ownerPrompt);
  }
  static async processCommandWithStitch(ownerPrompt: string, stitchDesignId?: string): Promise<any> {
    return stitchDesignId ? this.importFromStitch(stitchDesignId) : this.runMultiModelStitchPipeline(ownerPrompt);
  }
  static async enhancePrompt(ownerPrompt: string): Promise<{ enhancedPrompt: string; explanation: string }> {
    const startTime = Date.now();
    try {
      const res = await OlivePizzaAISDK.enhancePrompt({ prompt: ownerPrompt, targetType: 'sdui' });
      return { enhancedPrompt: res.enhancedPrompt || ownerPrompt, explanation: `DeepSeek V4 Flash via OlivePizzaAISDK optimized prompt in ${Date.now() - startTime}ms` };
    } catch {
      return { enhancedPrompt: ownerPrompt, explanation: 'Passthrough (SDK unavailable)' };
    }
  }
  static async runMultiModelStitchPipeline(ownerPrompt: string): Promise<DesignPipelineResult> {
    const startTime = Date.now();
    const pipelineResults: DesignPipelineResult['pipelineResults'] = [];
    console.log(`\n[SDUI Design Agent] ========================================`);
    console.log(`[SDUI Design Agent] Starting multi-model pipeline for: "${ownerPrompt}"`);
    // Step 1: DeepSeek V4 Pro
    const reasoning = await OlivePizzaAISDK.requestDesignReasoning({ ownerPrompt });
    pipelineResults.push({ modelId: 'deepseek_v4_pro', modelName: 'DeepSeek V4 Pro', role: 'Design Reasoning & Requirement Analysis', suggestion: reasoning.layoutStrategy || reasoning.reasoning.slice(0, 120), latencyMs: reasoning.latencyMs, success: true });
    // Step 2: GLM 5.2
    const advice = await OlivePizzaAISDK.requestDesignAdvice({ ownerPrompt, reasoningFromDeepSeek: reasoning.reasoning });
    pipelineResults.push({ modelId: 'glm_5_2', modelName: 'GLM 5.2', role: 'Design Advice & Second-Opinion Strategy', suggestion: advice.advice.slice(0, 120), latencyMs: advice.latencyMs, success: true });
    // Step 3: DeepSeek V4 Flash
    const stitchPromptResult = await OlivePizzaAISDK.enhanceStitchPrompt({ ownerPrompt, reasoning: reasoning.reasoning, advice: advice.advice });
    const stitchPrompt = stitchPromptResult.stitchPrompt;
    pipelineResults.push({ modelId: 'deepseek_v4_flash', modelName: 'DeepSeek V4 Flash', role: 'Stitch Prompt Optimization', suggestion: 'Formatted optimized design spec for Google Stitch Engine.', latencyMs: stitchPromptResult.latencyMs, success: true });
    // Step 4: Google Stitch
    let stitchResult: any = null;
    try {
      stitchResult = await StitchService.generateStitchDesign(stitchPrompt);
      pipelineResults.push({ modelId: 'google_stitch', modelName: 'Google Stitch Engine', role: 'Visual Layout Synthesis (Project 1381594740219373157)', suggestion: `Generated ${stitchResult.sections.length} visual component layouts.`, latencyMs: stitchResult.telemetry.lastLatencyMs, success: true });
    } catch (stitchErr: any) {
      const telemetry = StitchService.getTelemetry();
      pipelineResults.push({ modelId: 'google_stitch', modelName: 'Google Stitch Engine', role: 'Visual Layout Synthesis', suggestion: `Stitch Error: ${stitchErr.message}`, latencyMs: telemetry.lastLatencyMs || 0, success: false });
      return { success: false, ownerPrompt, enhancedPrompt: stitchPrompt, pipelineResults, mergedLayout: { sections: [] }, explanation: `Google Stitch Engine Error: ${stitchErr.message}. Check STITCH_API_KEY and STITCH_PROJECT_ID configuration.`, previewReady: false, totalLatencyMs: Date.now() - startTime, telemetry, fallbackStatus: 'Disabled', designReasoning: reasoning.reasoning, designAdvice: advice.advice };
    }
    const sections = stitchResult.sections;
    // Step 5: Safety Review
    const safetyReview = await OlivePizzaAISDK.reviewDesignSafety({ sections, ownerPrompt });
    pipelineResults.push({ modelId: 'deepseek_v4_pro_review', modelName: 'DeepSeek V4 Pro', role: 'Visual & Functional Safety Review', suggestion: `Score: ${safetyReview.overallScore}/100. ${safetyReview.unmappedButtons.length} unmapped button(s).`, latencyMs: safetyReview.latencyMs, success: true });
    console.log(`[SDUI Design Agent] ========================================\n`);
    return { success: true, ownerPrompt, enhancedPrompt: stitchPrompt, pipelineResults, mergedLayout: { sections }, explanation: `Google Stitch Engine generated ${sections.length} visual sections. Safety score: ${safetyReview.overallScore}/100. Pipeline: DeepSeek V4 Pro -> GLM 5.2 -> DeepSeek V4 Flash -> Google Stitch -> Safety Review.`, previewReady: true, totalLatencyMs: Date.now() - startTime, telemetry: stitchResult.telemetry, fallbackStatus: 'Disabled', designReasoning: reasoning.reasoning, designAdvice: advice.advice, safetyReview };
  }
  static async importFromStitch(stitchDesignId: string): Promise<{ success: boolean; layout: any; explanation: string; fallbackStatus: 'Disabled' }> {
    try {
      const stitchData = await StitchService.getDesignById(stitchDesignId);
      const mappedColors = StitchColorMapper.mapToOlivePizzaPalette(stitchData);
      const sections = [{ id: 'hero_stitch_' + Date.now(), type: 'hero', label: stitchData?.name || (stitchData as any)?.title || 'Imported Stitch Hero Layout', subtitle: 'Layout structure imported directly from Google Stitch Design System', isVisible: true, order: 0, style: { bgType: 'glass', primaryColor: mappedColors.primary }, config: { title: stitchData?.name || (stitchData as any)?.title || 'Artisanal Pizza Experience', ctaText: 'Order Now' } }];
      return { success: true, layout: { sections }, explanation: 'Successfully imported Google Stitch layout into Olive Pizza SDUI sections.', fallbackStatus: 'Disabled' };
    } catch (err: any) {
      throw new Error(`Stitch Import Error: ${err.message}`);
    }
  }
}
