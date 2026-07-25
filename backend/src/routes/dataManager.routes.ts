import express from 'express';
import { storageAnalyzer } from '../services/storageAnalyzer.service.js';

const router = express.Router();

router.get('/overview', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const data = await storageAnalyzer.getOverview(force);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/firestore', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const data = await storageAnalyzer.getFirestoreUsage(force);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/supabase', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const data = await storageAnalyzer.getSupabaseUsage(force);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/cloudinary', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const data = await storageAnalyzer.getCloudinaryUsage(force);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/google-drive', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const data = await storageAnalyzer.getDriveUsage(force);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/qdrant', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const data = await storageAnalyzer.getQdrantUsage(force);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/email', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const data = await storageAnalyzer.getEmailUsage(force);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const data = await storageAnalyzer.getNotificationUsage(force);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

import { pgPool } from '../config/postgres.js';

router.get('/history', async (req, res) => {
  try {
    const provider = req.query.provider as string;
    const client = await pgPool.connect();
    
    // Fetch last 50 data points for the mini charts
    let query = 'SELECT * FROM storage_analytics ';
    let params: any[] = [];
    
    if (provider && provider !== 'all') {
      query += 'WHERE provider = $1 ';
      params.push(provider);
    }
    query += 'ORDER BY timestamp DESC LIMIT 50;';
    
    const result = await client.query(query, params);
    
    // Also fetch daily history for long term trend
    let dailyQuery = 'SELECT * FROM storage_analytics_daily ';
    if (provider && provider !== 'all') {
      dailyQuery += 'WHERE provider = $1 ';
    }
    dailyQuery += 'ORDER BY date DESC LIMIT 30;';
    const dailyResult = await client.query(dailyQuery, params);
    
    client.release();
    
    res.json({
      recent: result.rows.reverse(),
      daily: dailyResult.rows.reverse()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/app-storage', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const getDirSize = (dirPath: string): number => {
      if (!fs.existsSync(dirPath)) return 0;
      let totalSize = 0;
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
          totalSize += getDirSize(fullPath);
        } else {
          try { totalSize += fs.statSync(fullPath).size; } catch {}
        }
      }
      return totalSize;
    };

    // Scan dist folder relative to project root
    const projectRoot = path.resolve(__dirname, '../../../../');
    const distPath = path.join(projectRoot, 'dist');
    const distClientPath = path.join(distPath, 'client');
    const distServerPath = path.join(distPath, 'server.js');

    const clientSize = getDirSize(distClientPath);
    const serverSize = fs.existsSync(distServerPath) ? fs.statSync(distServerPath).size : 0;
    const totalSize = clientSize + serverSize;

    res.json({
      totalUsedBytes: totalSize,
      breakdown: {
        'client (dist/client)': clientSize,
        'server (dist/server.js)': serverSize,
      },
      status: 'Healthy',
      scannedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, status: 'Error' });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const projectRoot = path.resolve(__dirname, '../../../../');

    const logDirs = [
      path.join(projectRoot, 'logs'),
      path.join(projectRoot, 'backend', 'logs'),
      '/tmp',
    ];

    let totalSize = 0;
    let fileCount = 0;
    const scanned: string[] = [];

    for (const dir of logDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const f of files) {
        if (f.endsWith('.log') || f.endsWith('.txt')) {
          try {
            const stat = fs.statSync(path.join(dir, f));
            totalSize += stat.size;
            fileCount++;
          } catch {}
        }
      }
      scanned.push(dir);
    }

    res.json({
      totalUsedBytes: totalSize,
      fileCount,
      scannedDirectories: scanned,
      status: 'Healthy',
      note: totalSize === 0 ? 'No log files found — logs may be streamed to stdout only.' : undefined,
      scannedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, status: 'Error' });
  }
});

// ── Developer Dashboard Controls ────────────────────────────────────────────────
router.post('/devops/email-retry/:id', async (req, res) => {
  try {
    const emailId = parseInt(req.params.id, 10);
    const { DevOpsService } = await import('../services/devOps/DevOpsService.js');
    const result = await DevOpsService.retryFailedEmail(emailId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/devops/test-alert', async (req, res) => {
  try {
    const { DevOpsService } = await import('../services/devOps/DevOpsService.js');
    const result = await DevOpsService.sendTestDevAlert();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
