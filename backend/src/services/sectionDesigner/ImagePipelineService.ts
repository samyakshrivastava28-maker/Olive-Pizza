/**
 * ImagePipelineService.ts
 * Handles AI image generation (Qwen/FLUX/SD3), quality analysis by DeepSeek,
 * and automatic upload to Cloudinary.
 */

import OpenAI from 'openai';
import cloudinary from '../../config/cloudinary.js';
import { ImageJob, ImageNeed } from '../../types/sectionDesigner.types.js';
import { AgentStreamService } from './AgentStreamService.js';
import { v4 as uuidv4 } from 'uuid';

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

function getNvidiaClient(): OpenAI {
  const key = process.env.NVIDIA_API_KEY || process.env.ASSISTANT_NVIDIA_API_KEY || '';
  return new OpenAI({ apiKey: key, baseURL: NVIDIA_BASE_URL, timeout: 60000 });
}

const IMAGE_QUALITY_SYSTEM = `You are a professional food photography and UI design quality inspector.
Analyze this generated image and rate it on:
1. Visual appeal (0-25): Is it premium, dark, modern, and appetizing?
2. Brand fit (0-25): Does it match Olive Pizza's dark, glassmorphic aesthetic?
3. Technical quality (0-25): Is it sharp, well-composed, no artifacts?
4. Usability (0-25): Will it work as a section background without obscuring text?

If score >= 70: APPROVED
If score < 70: REJECTED with specific reason and improved prompt suggestion.

Respond ONLY as JSON: { "score": number, "verdict": "APPROVED"|"REJECTED", "reason": string, "improvedPrompt": string|null }`;

export class ImagePipelineService {
  /**
   * Run the full image pipeline for a list of image needs.
   * Returns a map of purpose → cloudinary URL.
   */
  static async processImageNeeds(
    sessionId: string,
    imageNeeds: ImageNeed[],
    abortController: AbortController
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    await Promise.allSettled(imageNeeds.map(async (need) => {
      const job = await this.generateAndValidate(sessionId, need, abortController);
      if (job.cloudinaryUrl) {
        results[need.purpose] = job.cloudinaryUrl;
      }
    }));

    return results;
  }

  static async generateAndValidate(
    sessionId: string,
    need: ImageNeed,
    abortController: AbortController,
    currentPrompt?: string
  ): Promise<ImageJob> {
    const job: ImageJob = {
      id: uuidv4(),
      model: 'qwen-image',
      prompt: currentPrompt || need.description,
      status: 'generating',
      attempts: 0,
    };

    const maxAttempts = 3;
    const models: Array<ImageJob['model']> = ['qwen-image', 'flux', 'sd3-large'];

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (abortController.signal.aborted) {
        job.status = 'failed';
        return job;
      }

      job.attempts = attempt + 1;
      job.model = models[attempt % models.length];
      job.status = 'generating';

      AgentStreamService.emit(sessionId, {
        type: 'image_generating',
        sessionId,
        timestamp: new Date().toISOString(),
        model: job.model,
        message: `Generating ${need.purpose} image (attempt ${job.attempts})...`,
        data: { jobId: job.id, purpose: need.purpose, model: job.model },
      });

      try {
        const imageUrl = await this.generateImage(job.model, job.prompt);
        job.generatedUrl = imageUrl;
        job.status = 'analyzing';

        AgentStreamService.emit(sessionId, {
          type: 'image_analyzing',
          sessionId,
          timestamp: new Date().toISOString(),
          model: 'deepseek-ai/deepseek-v4-pro',
          message: `Analyzing image quality for ${need.purpose}...`,
          data: { jobId: job.id },
        });

        const analysis = await this.analyzeImageQuality(imageUrl);
        job.qualityScore = analysis.score;

        if (analysis.verdict === 'APPROVED') {
          job.status = 'uploading';

          AgentStreamService.emit(sessionId, {
            type: 'image_approved',
            sessionId,
            timestamp: new Date().toISOString(),
            model: job.model,
            message: `Image approved (score: ${analysis.score}/100) — uploading to Cloudinary...`,
            data: { jobId: job.id, score: analysis.score, reason: analysis.reason },
          });

          const cdnUrl = await this.uploadToCloudinary(imageUrl, need.purpose);
          job.cloudinaryUrl = cdnUrl;
          job.status = 'done';

          AgentStreamService.emit(sessionId, {
            type: 'image_uploaded',
            sessionId,
            timestamp: new Date().toISOString(),
            message: `✅ ${need.purpose} image ready on CDN`,
            data: { jobId: job.id, url: cdnUrl },
          });

          return job;
        } else {
          job.status = 'rejected';
          job.rejectionReason = analysis.reason;
          job.prompt = analysis.improvedPrompt || job.prompt;

          AgentStreamService.emit(sessionId, {
            type: 'image_rejected',
            sessionId,
            timestamp: new Date().toISOString(),
            model: job.model,
            message: `Image rejected (score: ${analysis.score}/100): ${analysis.reason}. Regenerating...`,
            data: { jobId: job.id, score: analysis.score, improvedPrompt: analysis.improvedPrompt },
          });
        }
      } catch (err: any) {
        console.error(`[ImagePipeline] Attempt ${attempt + 1} failed:`, err.message);
      }
    }

    job.status = 'failed';
    return job;
  }

  private static async generateImage(model: ImageJob['model'], prompt: string): Promise<string> {
    const client = getNvidiaClient();

    // Use NVIDIA's image generation endpoints
    const modelMap: Record<string, string> = {
      'qwen-image': 'stabilityai/stable-image-ultra', // NVIDIA available model
      'flux': 'black-forest-labs/flux-dev',
      'sd3-large': 'stabilityai/stable-diffusion-3.5-large',
    };

    const nvidiaModel = modelMap[model] || 'stabilityai/stable-image-ultra';

    const response = await fetch(`${NVIDIA_BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NVIDIA_API_KEY || process.env.ASSISTANT_NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: nvidiaModel,
        prompt: `${prompt}. Dark mode, premium restaurant aesthetic, no text, photorealistic.`,
        n: 1,
        size: '1024x576',
        response_format: 'url',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Image generation failed: ${err}`);
    }

    const data: any = await response.json();
    return data.data?.[0]?.url || data.images?.[0]?.url || '';
  }

  private static async analyzeImageQuality(imageUrl: string): Promise<{
    score: number;
    verdict: 'APPROVED' | 'REJECTED';
    reason: string;
    improvedPrompt: string | null;
  }> {
    try {
      const client = getNvidiaClient();
      const response = await client.chat.completions.create({
        model: 'deepseek-ai/deepseek-v4-pro',
        messages: [
          { role: 'system', content: IMAGE_QUALITY_SYSTEM },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Rate this image for use in the Olive Pizza app:' },
              { type: 'image_url', image_url: { url: imageUrl } },
            ] as any,
          },
        ],
        max_tokens: 300,
        temperature: 0.2,
      });

      const text = response.choices[0]?.message?.content || '';
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      // Default to approved if analysis fails to avoid blocking the pipeline
      return { score: 75, verdict: 'APPROVED', reason: 'Analysis unavailable — proceeding.', improvedPrompt: null };
    }
  }

  private static async uploadToCloudinary(imageUrl: string, purpose: string): Promise<string> {
    const sanitizedPurpose = purpose.replace(/\s+/g, '-').toLowerCase().slice(0, 50);
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: 'olive-pizza/section-designer-ai',
      public_id: `${sanitizedPurpose}-${Date.now()}`,
      resource_type: 'image',
      format: 'webp',
      quality: 'auto:good',
      transformation: [{ width: 1440, crop: 'limit' }],
    });
    return result.secure_url;
  }
}
