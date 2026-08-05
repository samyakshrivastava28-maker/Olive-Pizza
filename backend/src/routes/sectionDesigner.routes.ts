/**
 * sectionDesigner.routes.ts
 * REST API routes for the Section Designer.
 * 
 * Endpoints:
 *   POST   /api/section-designer/start         — Start a new session
 *   GET    /api/section-designer/stream/:id    — SSE stream
 *   DELETE /api/section-designer/session/:id   — Cancel session
 *   POST   /api/section-designer/answer/:id    — Answer a question
 *   GET    /api/section-designer/stitch/components — List Stitch designs
 *   POST   /api/section-designer/save-draft    — Save draft
 *   POST   /api/section-designer/publish       — Publish to live
 */

import { Router } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { AgentStreamService } from '../services/sectionDesigner/AgentStreamService.js';
import { OrchestratorService } from '../services/sectionDesigner/OrchestratorService.js';
import { StitchService } from '../services/stitch/StitchService.js';
import { adminDb } from '../config/firebase.js';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';

const router = Router();

/**
 * POST /api/section-designer/start
 * Begin a new design session. Returns sessionId immediately; actual work streams via SSE.
 */
router.post('/start', requireAuth, requireRole(['owner', 'admin', 'developer']), async (req: AuthRequest, res: Response) => {
  const { prompt, referenceImages } = req.body;

  if (!prompt?.trim()) {
    res.status(400).json({ success: false, error: 'prompt is required' });
    return;
  }

  const sessionId = uuidv4();
  const ownerId = req.user!.uid;

  // Kick off the pipeline (non-blocking — stream will push updates)
  OrchestratorService.startSession({
    sessionId,
    ownerId,
    prompt: prompt.trim(),
    referenceImages,
  }).catch(err => console.error('[Route] Start session error:', err));

  res.json({ success: true, sessionId });
});

/**
 * GET /api/section-designer/stream/:sessionId
 * SSE endpoint — client subscribes to receive agent events.
 */
router.get('/stream/:sessionId', requireAuth, (req: AuthRequest, res: Response) => {
  const { sessionId } = req.params;
  AgentStreamService.register(sessionId, res);
  // Note: response is kept open by AgentStreamService. No res.json() here.
});

/**
 * DELETE /api/section-designer/session/:sessionId
 * Cancel a running session.
 */
router.delete('/session/:sessionId', requireAuth, async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.params;
  OrchestratorService.cancelSession(sessionId);
  res.json({ success: true, cancelled: true });
});

/**
 * POST /api/section-designer/answer/:sessionId
 * Submit an answer to a pending question.
 */
router.post('/answer/:sessionId', requireAuth, async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.params;
  const { questionId, answer } = req.body;

  if (!questionId || answer === undefined) {
    res.status(400).json({ success: false, error: 'questionId and answer are required' });
    return;
  }

  const resolved = OrchestratorService.answerQuestion(sessionId, questionId, answer);

  if (!resolved) {
    res.status(404).json({ success: false, error: 'Session or question not found' });
    return;
  }

  res.json({ success: true });
});

/**
 * GET /api/section-designer/stitch/components
 * List available Google Stitch design components.
 */
router.get('/stitch/components', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const designs = await StitchService.listDesigns(20);
    res.json({ success: true, designs });
  } catch (err: any) {
    // Return empty array if Stitch is unavailable — non-fatal
    console.warn('[SectionDesigner] Stitch unavailable:', err.message);
    res.json({ success: true, designs: [], warning: 'Google Stitch is not configured or unavailable' });
  }
});

/**
 * POST /api/section-designer/save-draft
 * Save the current session's generated JSON as a homepage draft.
 */
router.post('/save-draft', requireAuth, requireRole(['owner', 'admin', 'developer']), async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    res.status(400).json({ success: false, error: 'sessionId is required' });
    return;
  }

  try {
    const sessionDoc = await adminDb.collection('section_designer_sessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    const sessionData = sessionDoc.data()!;
    if (!sessionData.finalJSON) {
      res.status(422).json({ success: false, error: 'No generated JSON found for this session' });
      return;
    }

    const draftId = `draft-${Date.now()}`;
    await adminDb.collection('website_config').doc('homepage_draft').set({
      ...sessionData.finalJSON,
      draftId,
      savedAt: new Date().toISOString(),
      sessionId,
      ownerId: req.user!.uid,
    });

    res.json({ success: true, draftId });
  } catch (err: any) {
    console.error('[SectionDesigner] Save draft error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/section-designer/publish
 * Publish the draft to the live homepage config.
 */
router.post('/publish', requireAuth, requireRole(['owner', 'admin']), async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.body;

  try {
    // Get the current draft
    const draftDoc = await adminDb.collection('website_config').doc('homepage_draft').get();
    if (!draftDoc.exists) {
      res.status(404).json({ success: false, error: 'No draft found to publish' });
      return;
    }

    const draftData = draftDoc.data()!;
    
    // Get current version
    const homepageDoc = await adminDb.collection('website_config').doc('homepage').get();
    const currentVersion = homepageDoc.exists ? (homepageDoc.data()?.version || 0) : 0;
    const newVersion = currentVersion + 1;

    await adminDb.collection('website_config').doc('homepage').set({
      ...draftData,
      version: newVersion,
      publishedAt: new Date().toISOString(),
      publishedBy: req.user!.uid,
    });

    res.json({ success: true, version: newVersion, publishedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error('[SectionDesigner] Publish error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
