import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import apiApp from './src/app.js';
import { DataRetentionJob } from './src/jobs/DataRetentionJob.js';
import './src/services/DataLifecycleService.js';
import './src/services/notification/NotificationQueueService.js';
import './src/jobs/WeeklyReportJob.js';
import { kb } from './src/services/KnowledgeBaseService.js';
import { qdrantService } from './src/services/ai/QdrantService.js';
import { storageAnalyzer } from './src/services/storageAnalyzer.service.js';

import { validateEnvironmentVariables } from './src/config/validator.js';

dotenv.config();

// ─── Environment Audit ────────────────────────────────────────────────────────
validateEnvironmentVariables();

const OPTIONAL_ENV = [
  ['NVIDIA_API_KEY', process.env.NVIDIA_API_KEY],
  ['OPENROUTER_API_KEY', process.env.OPENROUTER_API_KEY],
  ['GEMINI_API_KEY', process.env.GEMINI_API_KEY],
];

const missingOptional = OPTIONAL_ENV.filter(([, v]) => !v || String(v).trim().length < 10).map(([k]) => k);

if (missingOptional.length > 0) {
  console.warn(`💡 [ENV] Optional AI providers not configured: ${missingOptional.join(', ')}`);
  console.warn('   → AI chat will use Local Knowledge Base + Offline templates as fallback.');
} else {
  console.log('✅ [ENV] All AI provider keys configured.');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Initialize Storage Analyzer Cron Jobs
storageAnalyzer.startCronJobs();

app.get('/keep-alive', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', apiApp);

import { initScheduler } from './src/scripts/scheduler.js';
import { initPostgres } from './src/config/postgres.js';
import { FirestoreListener } from './src/listeners/firestore.listener.js';
import { initKeepAlive } from './src/scripts/keepAlive.js';
import { dynamicHtmlInjector } from './src/middleware/dynamicHtml.js';
import { webSocketServer } from './src/services/websocket/WebSocketServer.js';

// Setup Vite in development or static files in production
async function setupVite() {
  await initPostgres();
  initScheduler();
  DataRetentionJob.schedule();
  
  // Auto-sync all Firestore FCM tokens into PostgreSQL fcm_tokens on boot
  (async () => {
    try {
      const { adminDb: db } = await import('./src/config/firebase.js');
      const { pgPool } = await import('./src/config/postgres.js');
      const usersSnap = await db.collection('users').get();
      let syncedCount = 0;
      for (const doc of usersSnap.docs) {
        const tokens: string[] = doc.data().fcmTokens || [];
        for (const t of tokens) {
          if (t && typeof t === 'string') {
            await pgPool.query(
              `INSERT INTO fcm_tokens (user_id, token, is_active, last_used_at)
               VALUES ($1, $2, TRUE, NOW())
               ON CONFLICT (user_id, token) DO UPDATE SET is_active = TRUE, last_used_at = NOW()`,
              [doc.id, t]
            ).catch(() => {});
            syncedCount++;
          }
        }
      }
      console.log(`[FCM] ✅ Boot sync complete — ${syncedCount} tokens active in Postgres.`);
    } catch (err: any) {
      console.warn('[FCM] Boot sync warning:', err.message);
    }
  })();
  
  // Initialize AI Knowledge Base (auto-syncs with Firestore in real-time)
  kb.initialize().catch(err => console.warn('[KB] Non-fatal init error:', err.message));
  
  // Initialize Qdrant DB (768 dims = Gemini text-embedding-004)
  // Then auto-sync KB data into Qdrant after a short delay (KB needs time to load Firestore)
  qdrantService.initializeCollection(768).then(async (ok) => {
    if (ok) {
      console.log('[Qdrant] ✅ Collection ready — scheduling KB sync in 30s...');
      setTimeout(async () => {
        try {
          const { knowledgeSync } = await import('./src/services/ai/KnowledgeSync.js');
          const result = await knowledgeSync.syncAll();
          if (result.success) {
            console.log(`[Qdrant] ✅ KB auto-sync complete — ${result.stats?.syncedRecords ?? 0} records indexed`);
          } else {
            console.warn('[Qdrant] ⚠️ KB auto-sync completed with errors');
          }
        } catch (e: any) {
          console.warn('[Qdrant] ⚠️ KB auto-sync failed (non-fatal):', e.message);
        }
      }, 30_000);
    }
  }).catch(err => console.warn('[Qdrant] Non-fatal init error:', err.message));


  // Initialize Slack Notification Listeners
  FirestoreListener.init();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    console.log('[Dev] Vite imported successfully.');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    console.log('[Dev] Vite server created.');
    app.use(vite.middlewares);
  } else {
    const clientPath = path.resolve(__dirname, '../dist/client');
    app.use(express.static(clientPath, { index: false })); // Disable default index.html serving
    app.get('*', dynamicHtmlInjector);
  }

  const server = app.listen(PORT as number, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name]!) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`Network (Mobile): http://${net.address}:${PORT}`);
        }
      }
    }
    
    // Initialize Keep Alive Scheduler after server starts
    initKeepAlive();

    // Attach WebSocketServer for real-time in-app updates (order tracker, live dashboard)
    webSocketServer.attach(server);
    console.log('[WebSocketServer] Attached on path /ws');
  });
}

setupVite().catch(console.error);
