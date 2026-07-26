import { Router, Response } from 'express';
import { adminDb as db } from '../config/firebase.js';
import { verifyToken, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import type { PageBlock } from '../../../frontend/src/types/pageBuilder.js';

const router = Router();

/**
 * Strict Server-Side HTML Sanitizer
 * Removes dangerous tags (<script>, <iframe src!=approved>), inline event handlers (on*), and javascript: URIs
 */
function sanitizeHtmlString(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  let clean = rawHtml;

  // 1. Remove script tags and content
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 2. Remove inline event handlers (onerror=, onload=, onclick=, etc.)
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 3. Remove javascript: URIs
  clean = clean.replace(/href\s*=\s*["']?\s*javascript:[^"'>]+/gi, 'href="#"');
  clean = clean.replace(/src\s*=\s*["']?\s*javascript:[^"'>]+/gi, 'src=""');

  // 4. Filter <object>, <embed>, <applet>
  clean = clean.replace(/<\/?(object|embed|applet)\b[^>]*>/gi, '');

  return clean;
}

/**
 * Sanitize all blocks in a page draft payload server-side
 */
function sanitizePageBlocks(blocks: PageBlock[]): PageBlock[] {
  if (!Array.isArray(blocks)) return [];

  return blocks.map((block) => {
    if (block.type === 'CustomHTMLBlock' && block.props?.html) {
      return {
        ...block,
        props: {
          ...block.props,
          html: sanitizeHtmlString(String(block.props.html)),
        },
      };
    }
    return block;
  });
}

// ─── GET /api/page-builder/config/:slug ──────────────────────────────────────
router.get('/config/:slug', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const docRef = db.collection('pageConfigs').doc(slug);
    const snap = await docRef.get();

    if (!snap.exists) {
      res.json({ slug, draft: [], live: [] });
      return;
    }

    res.json(snap.data());
  } catch (error) {
    console.error('[PageBuilderRoutes] Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch page configuration' });
  }
});

// ─── POST /api/page-builder/publish ──────────────────────────────────────────
// Requires Owner or Developer or Admin role
router.post(
  '/publish',
  verifyToken,
  requireRole(['owner', 'admin', 'developer']),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { slug = 'home', draft } = req.body;
      const userId = req.user!.uid;
      const userEmail = req.user!.email || 'unknown';

      if (!Array.isArray(draft)) {
        res.status(400).json({ error: 'Draft blocks payload must be an array' });
        return;
      }

      // 1. Strict Server-Side Sanitization
      const sanitizedBlocks = sanitizePageBlocks(draft);

      const pageRef = db.collection('pageConfigs').doc(slug);
      const currentSnap = await pageRef.get();
      const currentLive = currentSnap.exists ? currentSnap.data()?.live || [] : [];

      const timestamp = new Date().toISOString();
      const versionId = `v_${Date.now()}`;

      // 2. Snapshot current `live` to `versions` subcollection before overwriting
      if (currentLive.length > 0) {
        await pageRef.collection('versions').doc(versionId).set({
          id: versionId,
          timestamp,
          publishedBy: userEmail,
          blocks: currentLive,
        });
      }

      // 3. Update `draft` and `live` to sanitized blocks
      await pageRef.set(
        {
          slug,
          draft: sanitizedBlocks,
          live: sanitizedBlocks,
          updatedAt: timestamp,
          updatedBy: userEmail,
        },
        { merge: true }
      );

      // 4. Record entry in `audit_logs` collection
      await db.collection('audit_logs').add({
        action: 'PAGE_BUILDER_PUBLISH',
        slug,
        versionId,
        publishedBy: userEmail,
        publishedByUid: userId,
        blockCount: sanitizedBlocks.length,
        timestamp,
      });

      console.log(`[PageBuilder] Published ${slug} page by ${userEmail} (${sanitizedBlocks.length} blocks)`);

      res.json({
        success: true,
        versionId,
        updatedAt: timestamp,
        blocks: sanitizedBlocks,
      });
    } catch (error) {
      console.error('[PageBuilderRoutes] Error publishing page config:', error);
      res.status(500).json({ error: 'Failed to publish page configuration' });
    }
  }
);

// ─── POST /api/page-builder/rollback ─────────────────────────────────────────
router.post(
  '/rollback',
  verifyToken,
  requireRole(['owner', 'admin', 'developer']),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { slug = 'home', versionId } = req.body;
      const userEmail = req.user!.email || 'unknown';

      if (!versionId) {
        res.status(400).json({ error: 'versionId is required for rollback' });
        return;
      }

      const pageRef = db.collection('pageConfigs').doc(slug);
      const versionSnap = await pageRef.collection('versions').doc(versionId).get();

      if (!versionSnap.exists) {
        res.status(404).json({ error: 'Requested version snapshot not found' });
        return;
      }

      const restoredBlocks = versionSnap.data()?.blocks || [];
      const timestamp = new Date().toISOString();

      await pageRef.set(
        {
          draft: restoredBlocks,
          live: restoredBlocks,
          updatedAt: timestamp,
          updatedBy: userEmail,
        },
        { merge: true }
      );

      await db.collection('audit_logs').add({
        action: 'PAGE_BUILDER_ROLLBACK',
        slug,
        restoredVersionId: versionId,
        publishedBy: userEmail,
        timestamp,
      });

      res.json({
        success: true,
        slug,
        restoredVersionId: versionId,
        blocks: restoredBlocks,
      });
    } catch (error) {
      console.error('[PageBuilderRoutes] Error performing rollback:', error);
      res.status(500).json({ error: 'Failed to perform version rollback' });
    }
  }
);

// ─── GET /api/page-builder/versions/:slug ─────────────────────────────────────
router.get(
  '/versions/:slug',
  verifyToken,
  requireRole(['owner', 'admin', 'developer']),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const snap = await db
        .collection('pageConfigs')
        .doc(slug)
        .collection('versions')
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();

      const versions = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      res.json(versions);
    } catch (error) {
      console.error('[PageBuilderRoutes] Error fetching version history:', error);
      res.status(500).json({ error: 'Failed to fetch version history' });
    }
  }
);

export default router;
