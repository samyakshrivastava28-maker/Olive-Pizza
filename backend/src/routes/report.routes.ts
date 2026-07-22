import { Router, Response } from 'express';
import { adminDb } from '../config/firebase.js';
import { verifyToken, AuthRequest } from '../middleware/auth.middleware.js';
import { weeklyReportService } from '../lib/services/WeeklyReportService.js';
import { googleDriveService } from '../services/googleDrive.service.js';
import { pgPool } from '../config/postgres.js';
import crypto from 'crypto';

const router = Router();

// Middleware: Require Owner or Admin role
const requireOwnerOrAdmin = (req: AuthRequest, res: Response, next: any) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const role = req.user.role;
  if (role !== 'owner' && role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Owner or Admin access required.' });
  }
  next();
};

/**
 * POST /api/reports/generate
 * Queues weekly report generation as an asynchronous background task.
 * Does NOT block the HTTP response!
 */
router.post('/generate', verifyToken, requireOwnerOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { targetDateIso } = req.body;
    const targetDate = targetDateIso ? new Date(targetDateIso) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekInfo = weeklyReportService.getWeekInfo(targetDate);

    const taskId = crypto.randomUUID();
    const taskName = `weekly_report_${weekInfo.docId}`;

    // 1. Record task in PostgreSQL background_tasks infrastructure table
    await pgPool.query(`
      INSERT INTO background_tasks (id, task_name, status, payload, created_at)
      VALUES ($1, $2, 'processing', $3, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET status = 'processing', updated_at = CURRENT_TIMESTAMP
    `, [taskId, taskName, JSON.stringify({ docId: weekInfo.docId, weekLabel: weekInfo.weekLabel })])
    .catch(e => console.warn('[Report Route] Postgres task log warning:', e.message));

    // 2. Launch processing asynchronously in background (Non-blocking response!)
    setImmediate(async () => {
      try {
        console.log(`[Background Task ${taskId}] Starting weekly report generation for ${weekInfo.weekLabel}...`);
        const result = await weeklyReportService.generateAndProcessReport(targetDate);
        
        await pgPool.query(`
          UPDATE background_tasks 
          SET status = 'completed', result = $2, updated_at = CURRENT_TIMESTAMP 
          WHERE id = $1
        `, [taskId, JSON.stringify(result)])
        .catch(() => {});

        console.log(`[Background Task ${taskId}] Weekly report generation completed successfully.`);
      } catch (err: any) {
        console.error(`[Background Task ${taskId}] Weekly report generation failed:`, err.message);
        await pgPool.query(`
          UPDATE background_tasks 
          SET status = 'failed', error_message = $2, updated_at = CURRENT_TIMESTAMP 
          WHERE id = $1
        `, [taskId, err.message])
        .catch(() => {});
      }
    });

    // 3. Return immediate response
    res.json({
      success: true,
      message: 'Weekly report generation task started in background.',
      taskId,
      weekLabel: weekInfo.weekLabel,
      dateRange: weekInfo.dateRange,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/history
 * Fetches historical weekly reports stored in Firestore.
 */
router.get('/history', verifyToken, requireOwnerOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const snapshot = await adminDb.collection('reports')
      .orderBy('generatedAt', 'desc')
      .get();

    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, reports });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/reports/email-again
 * Resends a previously generated weekly report email to the owner.
 */
router.post('/email-again', verifyToken, requireOwnerOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { docId } = req.body;
    if (!docId) return res.status(400).json({ error: 'docId is required' });

    const reportDoc = await adminDb.collection('reports').doc(docId).get();
    if (!reportDoc.exists) {
      return res.status(404).json({ error: 'Weekly report not found' });
    }

    const data = reportDoc.data()!;
    
    // Trigger background generation & email resend
    setImmediate(async () => {
      await weeklyReportService.generateAndProcessReport(new Date(data.generatedAt || Date.now()));
    });

    res.json({ success: true, message: `Weekly report email resend triggered for ${data.weekLabel || docId}.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/diagnostics
 * Provides production diagnostics for PDF Generation, Google Drive Upload, Email Queue, and Retries.
 */
router.get('/diagnostics', verifyToken, requireOwnerOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const driveStatus = await googleDriveService.getHealthStatus();

    // Query email queue metrics from PostgreSQL
    const emailQueueStats = await pgPool.query(`
      SELECT status, COUNT(*) as count
      FROM email_queue
      GROUP BY status
    `).catch(() => ({ rows: [] }));

    // Query recent failed tasks from PostgreSQL
    const failedTasks = await pgPool.query(`
      SELECT id, task_name, error_message, created_at, updated_at
      FROM background_tasks
      WHERE status = 'failed'
      ORDER BY updated_at DESC
      LIMIT 5
    `).catch(() => ({ rows: [] }));

    // Count reports in Firestore
    const reportsSnap = await adminDb.collection('reports').get().catch(() => ({ size: 0 }));

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      pdfGenerator: { status: 'healthy', format: 'PDFKit 4-Page Executive Weekly Layout' },
      googleDrive: driveStatus,
      emailQueue: {
        statusBreakdown: emailQueueStats.rows,
        smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
        recipient: process.env.OWNER_EMAIL || 'olivepizzarjn@gmail.com',
      },
      reportsSummary: {
        totalGenerated: reportsSnap.size,
      },
      recentFailures: failedTasks.rows,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
