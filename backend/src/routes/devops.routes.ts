/**
 * Express Router for Developer Operations (/devops)
 * Protected by requireDeveloper middleware.
 */
import { Router, Response } from 'express';
import { requireDeveloper, DevRequest } from '../middleware/requireDeveloper.js';
import { DevOpsService } from '../services/devOps/DevOpsService.js';
import { NotificationLogger } from '../services/notification/NotificationLogger.js';

const router = Router();

// Apply requireDeveloper guard to all /devops endpoints
router.use(requireDeveloper);

/**
 * GET /devops/health — System health & queue metrics
 */
router.get('/health', async (req: DevRequest, res: Response) => {
  try {
    const health = await DevOpsService.getSystemHealth();
    res.json({ success: true, data: health });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /devops/notifications/diagnostics — Notification pipeline trace
 */
router.get('/notifications/diagnostics', async (req: DevRequest, res: Response) => {
  try {
    const orderId = req.query.orderId as string | undefined;
    const diagnostics = await DevOpsService.getNotificationDiagnostics(orderId);
    res.json({ success: true, data: diagnostics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /devops/notifications/logs — FCM delivery log file contents
 */
router.get('/notifications/logs', async (req: DevRequest, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) || '100', 10);
    const logs = NotificationLogger.getRecentLogs(limit);
    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /devops/notifications/pipeline-monitor — Live notification monitor
 */
router.get('/notifications/pipeline-monitor', async (req: DevRequest, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) || '100', 10);
    const data = await DevOpsService.getNotificationPipelineMonitorData(limit);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /devops/security-logs — Security audit logs
 */
router.get('/security-logs', async (req: DevRequest, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) || '100', 10);
    const logs = await DevOpsService.getSecurityLogs(limit);
    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /devops/init-claim — Utility endpoint to auto-grant `developer: true` custom claim to webhub2811@gmail.com
 */
router.post('/init-claim', async (req: DevRequest, res: Response) => {
  try {
    const result = await DevOpsService.ensureDeveloperClaim('webhub2811@gmail.com');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
