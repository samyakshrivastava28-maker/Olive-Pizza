import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import apiApp from './src/app.js';
import { DataRetentionJob } from './src/jobs/DataRetentionJob.js';
import './src/services/DataLifecycleService.js';
import './src/services/notification/NotificationQueueService.js';
import './src/jobs/MonthlyReportJob.js';
import { kb } from './src/services/KnowledgeBaseService.js';

dotenv.config();

// ─── Environment Audit ────────────────────────────────────────────────────────
const REQUIRED_ENV = [
  ['FIREBASE_CREDENTIALS', process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)],
  ['DATABASE_URL', process.env.DATABASE_URL],
  ['SUPABASE_URL', process.env.SUPABASE_URL],
  ['SUPABASE_SERVICE_KEY', process.env.SUPABASE_SERVICE_KEY],
  ['SMTP', process.env.SMTP_HOST || process.env.EMAIL_HOST],
  ['CLOUDINARY', process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME],
];
const OPTIONAL_ENV = [
  ['NVIDIA_API_KEY', process.env.NVIDIA_API_KEY],
  ['OPENROUTER_API_KEY', process.env.OPENROUTER_API_KEY],
  ['GEMINI_API_KEY', process.env.GEMINI_API_KEY],
];

const missingEnv = REQUIRED_ENV.filter(([, v]) => !v).map(([k]) => k);
const missingOptional = OPTIONAL_ENV.filter(([, v]) => !v || String(v).trim().length < 10).map(([k]) => k);

if (missingEnv.length > 0) {
  console.warn(`⚠️  [ENV] Missing required variables: ${missingEnv.join(', ')}`);
  console.warn('   → Some features may not work. Check backend/.env or your deployment config.');
} else {
  console.log('✅ [ENV] All required environment variables are configured.');
}
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

// Setup Vite in development or static files in production
async function setupVite() {
  await initPostgres();
  initScheduler();
  DataRetentionJob.schedule();
  
  // Initialize AI Knowledge Base (auto-syncs with Firestore in real-time)
  kb.initialize().catch(err => console.warn('[KB] Non-fatal init error:', err.message));

  // Initialize Slack Notification Listeners
  FirestoreListener.init();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const clientPath = path.resolve(__dirname, '../dist/client');
    app.use(express.static(clientPath, { index: false })); // Disable default index.html serving
    app.get('*', dynamicHtmlInjector);
  }

  app.listen(PORT as number, '0.0.0.0', () => {
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
  });
}

setupVite().catch(console.error);
