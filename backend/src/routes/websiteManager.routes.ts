import { Router, Response } from 'express';
import { verifyToken, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { requireDeveloper } from '../middleware/requireDeveloper.js';
import { WebsiteConfigService } from '../services/websiteConfig/WebsiteConfigService.js';
import { VersionHistoryService } from '../services/websiteConfig/VersionHistoryService.js';
import { ABTestingService } from '../services/websiteConfig/ABTestingService.js';
import { CampaignService } from '../services/websiteConfig/CampaignService.js';

const router = Router();

// ── Public Routes (Customers need active layout & theme) ─────────────────────
router.get('/homepage', async (_req, res: Response) => {
  try {
    const config = await WebsiteConfigService.getHomepage();
    res.json(config);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/theme', async (_req, res: Response) => {
  try {
    const theme = await WebsiteConfigService.getTheme();
    res.json(theme);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/navigation', async (_req, res: Response) => {
  try {
    const nav = await WebsiteConfigService.getNavigation();
    res.json(nav);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/feature-flags', async (_req, res: Response) => {
  try {
    const flags = await WebsiteConfigService.getFeatureFlags();
    res.json(flags);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Protected Routes (Owner, Admin, Developer) ──────────────────────────────
router.get('/homepage/draft', verifyToken, requireRole(['owner', 'admin', 'developer']), async (_req: AuthRequest, res: Response) => {
  try {
    const draft = await WebsiteConfigService.getHomepageDraft();
    res.json(draft);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/homepage/draft', verifyToken, requireRole(['owner', 'admin', 'developer']), async (req: AuthRequest, res: Response) => {
  try {
    const isDev = req.user?.role === 'developer' || (req.user as any)?.developer === true;
    await WebsiteConfigService.saveHomepageDraft(req.body, req.user?.uid || 'anonymous', isDev);
    res.json({ success: true, message: 'Draft saved successfully' });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/homepage/publish', verifyToken, requireRole(['owner', 'admin', 'developer']), async (req: AuthRequest, res: Response) => {
  try {
    const isDev = req.user?.role === 'developer' || (req.user as any)?.developer === true;
    const published = await WebsiteConfigService.publishHomepage(
      req.user?.uid || 'anonymous',
      req.user?.email,
      req.body?.changelog,
      isDev
    );
    res.json({ success: true, published });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/homepage/rollback/:versionId', verifyToken, requireRole(['owner', 'admin', 'developer']), async (req: AuthRequest, res: Response) => {
  try {
    const isDev = req.user?.role === 'developer' || (req.user as any)?.developer === true;
    const rolledBack = await VersionHistoryService.rollbackHomepage(
      req.params.versionId,
      req.user?.uid || 'anonymous',
      isDev
    );
    res.json({ success: true, rolledBack });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/homepage/versions', verifyToken, requireRole(['owner', 'admin', 'developer']), async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const versions = await VersionHistoryService.listVersions(limit);
    res.json(versions);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/theme', verifyToken, requireRole(['owner', 'admin', 'developer']), async (req: AuthRequest, res: Response) => {
  try {
    const theme = await WebsiteConfigService.saveTheme(req.body, req.user?.uid || 'anonymous');
    res.json({ success: true, theme });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/navigation', verifyToken, requireRole(['owner', 'admin', 'developer']), async (req: AuthRequest, res: Response) => {
  try {
    const nav = await WebsiteConfigService.saveNavigation(req.body);
    res.json({ success: true, nav });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/feature-flags', verifyToken, requireRole(['owner', 'admin', 'developer']), async (req: AuthRequest, res: Response) => {
  try {
    const flags = await WebsiteConfigService.updateFeatureFlags(req.body);
    res.json({ success: true, flags });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Campaigns, Banners & Announcements ──────────────────────────────────────
router.get('/campaigns', async (_req, res: Response) => {
  try {
    const campaigns = await CampaignService.listCampaigns();
    res.json(campaigns);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/campaigns', verifyToken, requireRole(['owner', 'admin', 'developer']), async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await CampaignService.saveCampaign(req.body);
    res.json({ success: true, campaign });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/campaigns/:id/toggle', verifyToken, requireRole(['owner', 'admin', 'developer']), async (req: AuthRequest, res: Response) => {
  try {
    await CampaignService.toggleCampaign(req.params.id, req.body.isActive);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/banners', async (_req, res: Response) => {
  try {
    const banners = await CampaignService.listBanners();
    res.json(banners);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/banners', verifyToken, requireRole(['owner', 'admin', 'developer']), async (req: AuthRequest, res: Response) => {
  try {
    const banner = await CampaignService.saveBanner(req.body);
    res.json({ success: true, banner });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/banners/:id', verifyToken, requireRole(['owner', 'admin', 'developer']), async (req: AuthRequest, res: Response) => {
  try {
    await CampaignService.deleteBanner(req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/announcements', async (_req, res: Response) => {
  try {
    const announcements = await CampaignService.listAnnouncements();
    res.json(announcements);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/announcements', verifyToken, requireRole(['owner', 'admin', 'developer']), async (req: AuthRequest, res: Response) => {
  try {
    const announcement = await CampaignService.saveAnnouncement(req.body);
    res.json({ success: true, announcement });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/announcements/:id', verifyToken, requireRole(['owner', 'admin', 'developer']), async (req: AuthRequest, res: Response) => {
  try {
    await CampaignService.deleteAnnouncement(req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── A/B Testing ─────────────────────────────────────────────────────────────
router.get('/ab-tests', verifyToken, requireRole(['owner', 'admin', 'developer']), async (_req: AuthRequest, res: Response) => {
  try {
    const tests = await ABTestingService.listTests();
    res.json(tests);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/ab-tests', verifyToken, requireRole(['owner', 'admin', 'developer']), async (req: AuthRequest, res: Response) => {
  try {
    const test = await ABTestingService.saveTest(req.body);
    res.json({ success: true, test });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/ab-tests/:id/apply-winner', verifyToken, requireRole(['owner', 'admin', 'developer']), async (req: AuthRequest, res: Response) => {
  try {
    await ABTestingService.applyWinner(req.params.id, req.body.winner, req.user?.uid || 'anonymous');
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Reusable Section Templates ──────────────────────────────────────────────
router.get('/sections/library', verifyToken, requireRole(['owner', 'admin', 'developer']), async (_req: AuthRequest, res: Response) => {
  try {
    const templates = await WebsiteConfigService.getSectionTemplates();
    res.json(templates);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/sections/library', verifyToken, requireRole(['owner', 'admin', 'developer']), async (req: AuthRequest, res: Response) => {
  try {
    const template = await WebsiteConfigService.saveSectionTemplate(req.body, req.user?.uid || 'anonymous');
    res.json({ success: true, template });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/sections/library/:id', verifyToken, requireRole(['owner', 'admin', 'developer']), async (req: AuthRequest, res: Response) => {
  try {
    await WebsiteConfigService.deleteSectionTemplate(req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── DEVELOPER MASTER CONTROL ENDPOINTS (Require Developer Claim) ────────────
router.post('/dev/raw-config', verifyToken, requireDeveloper, async (req: AuthRequest, res: Response) => {
  try {
    const { collectionDoc, rawJson } = req.body;
    if (!collectionDoc || !rawJson) {
      return res.status(400).json({ error: 'collectionDoc and rawJson are required' });
    }
    await WebsiteConfigService.updateRawConfig(collectionDoc, rawJson, req.user?.uid || 'developer');
    res.json({ success: true, message: `Raw config for ${collectionDoc} updated` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/dev/lock-section', verifyToken, requireDeveloper, async (req: AuthRequest, res: Response) => {
  try {
    const { sectionId, isLocked } = req.body;
    const draft = await WebsiteConfigService.getHomepageDraft();
    const updatedSections = draft.sections.map((s) => (s.id === sectionId ? { ...s, isLocked } : s));
    await WebsiteConfigService.saveHomepageDraft({ sections: updatedSections }, req.user?.uid || 'developer', true);
    res.json({ success: true, message: `Section ${sectionId} lock state set to ${isLocked}` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
