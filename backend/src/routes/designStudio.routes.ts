import { Router, Response } from 'express';
import { verifyToken, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { DesignStudioService } from '../services/ai/DesignStudioService.js';
import { ReactComponentGenerator } from '../services/ai/ReactComponentGenerator.js';
import { WebsiteConfigService } from '../services/websiteConfig/WebsiteConfigService.js';
import { SDUIVersioningService } from '../services/sdui/SDUIVersioningService.js';
import { OlivePizzaAISDK } from '../services/OlivePizzaAISDK.js';
import { adminDb as db } from '../config/firebase.js';
import { pgPool } from '../config/postgres.js';


const router = Router();
router.use(verifyToken);
router.use(requireRole(['owner', 'admin', 'developer']));

// ── React + Framer Motion Component Generator ─────────────────────────────────
// Generate a single section as real TSX code
router.post('/generate-component', async (req: AuthRequest, res: Response) => {
  try {
    const { sectionType, prompt, stitchDesignId } = req.body;
    if (!sectionType || !prompt) {
      return res.status(400).json({ error: 'sectionType and prompt are required.' });
    }

    const result = await ReactComponentGenerator.generateSection(sectionType, prompt, stitchDesignId);

    // Save to Firestore for version history
    await db.collection('generated_components').add({
      userId: req.user?.uid,
      ...result,
    }).catch(() => {});

    res.json({ success: true, ...result });
  } catch (e: any) {
    console.error('[DesignStudio] generate-component error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Generate Full Homepage (React + Framer Motion) ────────────────────────────
router.post('/generate-homepage', async (req: AuthRequest, res: Response) => {
  try {
    const {
      prompt,
      sections = ['hero', 'categories', 'bestsellers', 'stats', 'testimonials', 'coupons'],
      stitchDesignId,
    } = req.body;

    if (!prompt) return res.status(400).json({ error: 'prompt is required.' });

    const result = await ReactComponentGenerator.generateHomepage(prompt, sections, stitchDesignId);

    await db.collection('generated_homepages').add({
      userId: req.user?.uid,
      prompt,
      sections: (result.sections || []).map((s: any) => ({
        componentName: s.componentName,
        sectionType: s.sectionType,
        animationsUsed: s.animationsUsed,
        generatedAt: s.generatedAt,
      })),
      totalAnimations: result.totalAnimations,
      generatedAt: new Date().toISOString(),
    }).catch(() => {});

    res.json({ success: true, ...result });
  } catch (e: any) {
    console.error('[DesignStudio] generate-homepage error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Download Generated Component as .tsx File ─────────────────────────────────
router.get('/download-component/:sessionId', async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const snap = await db.collection('generated_components').doc(sessionId).get();
    if (!snap.exists) return res.status(404).json({ error: 'Component not found' });

    const data = snap.data() as any;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${data.componentName}.tsx"`);
    res.send(data.tsxCode);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Phase 2: Generate Design via Full Multi-Model Pipeline ────────────────────
router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

    const currentLayout = await WebsiteConfigService.getHomepageDraft();
    const result = await DesignStudioService.generateDesign(prompt, currentLayout);

    // Store result for developer audit
    await db.collection('design_studio_sessions').add({
      userId: req.user?.uid,
      prompt,
      result,
      createdAt: new Date().toISOString(),
    }).catch(() => {});

    res.json(result);
  } catch (e: any) {
    console.error('[DesignStudio] generate error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Apply Approved Design (owner approved the merged layout) ──────────────────
router.post('/apply', async (req: AuthRequest, res: Response) => {
  try {
    const { mergedLayout } = req.body;
    if (!mergedLayout?.sections) return res.status(400).json({ error: 'mergedLayout.sections is required.' });

    await WebsiteConfigService.saveHomepageDraft(mergedLayout, req.user?.uid || 'unknown');
    res.json({ success: true, message: 'AI-designed layout applied to draft. Review and publish when ready.' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Generate Single Section via Fast AI ──────────────────────────────────────
router.post('/generate-section', async (req: AuthRequest, res: Response) => {
  try {
    const { sectionType, context } = req.body;
    if (!sectionType) return res.status(400).json({ error: 'sectionType is required.' });

    const section = await DesignStudioService.generateSection(sectionType, context || '');
    res.json({ success: true, section });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Enhanced Owner AI Command (Stitch-aware) ───────────────────────────────────
router.post('/command', async (req: AuthRequest, res: Response) => {
  try {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: 'Command is required.' });

    const result = await DesignStudioService.processCommandWithStitch(command, req.body.stitchDesignId);

    // Apply diff immediately
    if (result.diff?.sections) {
      await WebsiteConfigService.saveHomepageDraft({ sections: result.diff.sections }, req.user?.uid || 'unknown');
    }

    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Phase 4: AI Business Advisor & Analytics Explainer ───────────────────────
router.post('/analyze', async (req: AuthRequest, res: Response) => {
  try {
    // Fetch real analytics data
    let analyticsData: any = {};
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get orders summary from PostgreSQL
      const ordersResult = await pgPool.query(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as avg_order_value,
          DATE(created_at) as order_date
        FROM orders
        WHERE created_at >= $1 AND status != 'cancelled'
        GROUP BY DATE(created_at)
        ORDER BY order_date DESC
        LIMIT 7
      `, [sevenDaysAgo.toISOString()]);

      analyticsData = {
        last7Days: ordersResult.rows,
        period: '7 days',
      };
    } catch (dbErr: any) {
      console.warn('[DesignStudio] Analytics DB query failed:', dbErr.message);
      analyticsData = { error: 'Analytics data unavailable', period: '7 days' };
    }

    // Use AI to generate insights
    const { OpenAI } = await import('openai');
    const key = process.env.OPENROUTER_API_KEY || process.env.NVIDIA_API_KEY;
    if (!key) {
      return res.json({
        success: true,
        insights: [
          'Configure OPENROUTER_API_KEY or NVIDIA_API_KEY to enable AI analytics insights.',
          'Connect your data sources to get personalized business recommendations.',
        ],
        rawData: analyticsData,
      });
    }

    const client = new OpenAI({
      apiKey: key,
      baseURL: process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : 'https://integrate.api.nvidia.com/v1',
    });

    const response = await client.chat.completions.create({
      model: 'deepseek/deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `You are a friendly, concise business advisor for Olive Pizza restaurant.
Analyze the real analytics data and provide 3-5 actionable insights.
Speak in simple language that a restaurant owner can understand.
Be specific and suggest concrete actions.
Format your response as a JSON array of insight strings.
Example: ["You had 35% more orders on Friday. Consider launching weekend specials.", "..."]
NO markdown. Pure JSON array only.`,
        },
        {
          role: 'user',
          content: `Here is the last 7 days of order analytics data:\n${JSON.stringify(analyticsData, null, 2)}\n\nProvide 3-5 actionable insights for the restaurant owner.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 600,
    });

    const rawContent = response.choices[0]?.message?.content || '[]';
    const cleaned = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
    let insights: string[] = [];
    try {
      insights = JSON.parse(cleaned);
      if (!Array.isArray(insights)) insights = [cleaned];
    } catch {
      insights = [cleaned];
    }

    res.json({ success: true, insights, rawData: analyticsData });
  } catch (e: any) {
    console.error('[DesignStudio] analyze error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Phase 3: AI Content Studio — Generate Descriptions / SEO / Notifications ──
router.post('/content', async (req: AuthRequest, res: Response) => {
  try {
    const { contentType, context } = req.body;
    // contentType: 'product_description' | 'seo_meta' | 'push_notification' | 'coupon_text' | 'email_subject'

    if (!contentType) return res.status(400).json({ error: 'contentType is required.' });

    const key = process.env.OPENROUTER_API_KEY || process.env.NVIDIA_API_KEY;
    if (!key) {
      return res.json({
        success: false,
        error: 'AI API key not configured.',
        content: null,
      });
    }

    const { OpenAI } = await import('openai');
    const client = new OpenAI({
      apiKey: key,
      baseURL: process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : 'https://integrate.api.nvidia.com/v1',
    });

    const prompts: Record<string, string> = {
      product_description: `Write a mouth-watering, premium product description for an Olive Pizza menu item. Context: ${context}. Keep it under 60 words. Make it sound luxurious and delicious.`,
      seo_meta: `Write an SEO-optimized meta description for an Olive Pizza page. Context: ${context}. Max 155 characters. Include main keywords naturally.`,
      push_notification: `Write a compelling push notification for Olive Pizza customers. Context: ${context}. Max 70 characters for title, 120 characters for body. Make it urgent and enticing.`,
      coupon_text: `Write creative coupon offer text for Olive Pizza. Context: ${context}. Include the offer clearly, create urgency, keep it punchy.`,
      email_subject: `Write 3 A/B test email subject lines for Olive Pizza. Context: ${context}. Each max 50 characters. Output as a JSON array.`,
    };

    const prompt = prompts[contentType] || `Generate ${contentType} content for Olive Pizza: ${context}`;

    const response = await client.chat.completions.create({
      model: 'deepseek/deepseek-r1-distill-qwen-7b',
      messages: [
        { role: 'system', content: 'You are a premium restaurant copywriter for Olive Pizza. Write compelling, brand-consistent content.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content || '';
    res.json({ success: true, content, contentType });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Image Studio: Generate AI Images ─────────────────────────────────────────
router.post('/generate-image', async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, model = 'flux-schnell', imageType = 'product' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

    // Use Pollinations AI for reliable free image generation without 404s
    const encodedPrompt = encodeURIComponent(`Olive Pizza premium restaurant, ${prompt}. High quality food photography, dark luxurious background, warm lighting, professional restaurant aesthetic.`);
    const seed1 = Math.floor(Math.random() * 100000);
    const seed2 = Math.floor(Math.random() * 100000);
    
    const imageUrls = [
      `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&enhance=true&seed=${seed1}`,
      `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&enhance=true&seed=${seed2}`
    ];

    res.json({
      success: true,
      images: imageUrls,
      model: model || 'pollinations-flux',
      prompt,
      message: 'Review images below. Click "Approve & Upload" to save to Cloudinary.',
    });
  } catch (e: any) {
    console.error('[DesignStudio] image gen error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── SDUI Design Agent Routes ──────────────────────────────────────────────────

/**
 * POST /api/design-studio/sdui/generate
 * Full 5-step multi-model pipeline:
 *   DeepSeek V4 Pro → GLM 5.2 → DeepSeek V4 Flash → Google Stitch → Safety Review
 * All AI via OlivePizzaAISDK. Google Stitch is the ONLY visual design engine.
 */
router.post('/sdui/generate', async (req: AuthRequest, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required.' });

    const result = await DesignStudioService.runMultiModelStitchPipeline(prompt);

    // Audit log to Firestore
    await db.collection('sdui_design_agent_sessions').add({
      userId: req.user?.uid,
      userEmail: req.user?.email,
      prompt,
      pipelineSteps: result.pipelineResults?.length ?? 0,
      safetyScore: result.safetyReview?.overallScore,
      success: result.success,
      totalLatencyMs: result.totalLatencyMs,
      createdAt: new Date().toISOString(),
    }).catch(() => {});

    res.json(result);
  } catch (e: any) {
    console.error('[DesignStudio SDUI] generate error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/design-studio/sdui/save
 * Save a generated design draft to Cloudflare R2 with versioning.
 */
router.post('/sdui/save', async (req: AuthRequest, res: Response) => {
  try {
    const { sections, ownerPrompt, explanation, safetyScore, designReasoning, pipelineModels } = req.body;
    if (!sections || !Array.isArray(sections)) {
      return res.status(400).json({ error: 'sections array is required.' });
    }

    const record = await SDUIVersioningService.saveDesign({
      sections,
      ownerPrompt,
      explanation,
      safetyScore,
      designReasoning,
      pipelineModels,
      publishedBy: req.user?.uid,
    });

    res.json({ success: true, version: record, message: `Design draft saved as version ${record.versionNumber}.` });
  } catch (e: any) {
    console.error('[DesignStudio SDUI] save error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/design-studio/sdui/publish
 * Publish a saved draft version as the live SDUI.
 * Archives the previous live version. Updates Firestore SDUI config.
 */
router.post('/sdui/publish', async (req: AuthRequest, res: Response) => {
  try {
    const { versionId, sections, changelog } = req.body;
    if (!versionId) return res.status(400).json({ error: 'versionId is required.' });
    if (!sections || !Array.isArray(sections)) return res.status(400).json({ error: 'sections array is required.' });

    // 1. Save versioned package to R2 and update manifest
    const result = await SDUIVersioningService.publishDesign({
      versionId,
      publishedBy: req.user?.uid || 'owner',
      publishedByEmail: req.user?.email,
      sections,
    });

    // 2. Update the live Firestore SDUI homepage config (realtime listeners pick this up)
    await WebsiteConfigService.saveHomepageDraft({ sections }, req.user?.uid || 'owner');
    await WebsiteConfigService.publishHomepage(
      req.user?.uid || 'owner',
      req.user?.email,
      changelog || `Published SDUI Design Agent version ${versionId}`,
    );

    res.json({
      success: true,
      liveVersionId: result.liveVersionId,
      archivedVersionId: result.archivedVersionId,
      message: `Version ${versionId} is now LIVE. Previous version archived.`,
    });
  } catch (e: any) {
    console.error('[DesignStudio SDUI] publish error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/design-studio/sdui/rollback
 * Rollback to a previous version or restore the default UI.
 */
router.post('/sdui/rollback', async (req: AuthRequest, res: Response) => {
  try {
    const { targetVersionId, restoreDefault } = req.body;
    const publishedBy = req.user?.uid || 'owner';

    let result: { success: boolean; message: string };

    if (restoreDefault) {
      result = await SDUIVersioningService.restoreDefaultUI(publishedBy);
    } else {
      if (!targetVersionId) return res.status(400).json({ error: 'targetVersionId or restoreDefault is required.' });
      result = await SDUIVersioningService.rollbackToVersion({ targetVersionId, publishedBy });
    }

    res.json(result);
  } catch (e: any) {
    console.error('[DesignStudio SDUI] rollback error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/design-studio/sdui/versions
 * List all saved design versions from the R2 manifest.
 */
router.get('/sdui/versions', async (req: AuthRequest, res: Response) => {
  try {
    const manifest = await SDUIVersioningService.listVersions();
    res.json({ success: true, manifest });
  } catch (e: any) {
    console.error('[DesignStudio SDUI] versions error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/design-studio/sdui/ai-review
 * Run DeepSeek V4 Pro safety review on current sections via OlivePizzaAISDK.
 * Returns visual score, functional score, button mapping, and suggestions.
 */
router.post('/sdui/ai-review', async (req: AuthRequest, res: Response) => {
  try {
    const { sections, ownerPrompt } = req.body;
    if (!sections || !Array.isArray(sections)) {
      return res.status(400).json({ error: 'sections array is required.' });
    }

    const review = await OlivePizzaAISDK.reviewDesignSafety({
      sections,
      ownerPrompt: ownerPrompt || 'Olive Pizza homepage review',
    });

    res.json({ success: true, review });
  } catch (e: any) {
    console.error('[DesignStudio SDUI] ai-review error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/design-studio/sdui/version/:versionId
 * Get the full sections payload for a specific version.
 */
router.get('/sdui/version/:versionId', async (req: AuthRequest, res: Response) => {
  try {
    const { versionId } = req.params;
    const sections = await SDUIVersioningService.getVersionSections(versionId);
    res.json({ success: true, versionId, sections });
  } catch (e: any) {
    console.error('[DesignStudio SDUI] version get error:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

