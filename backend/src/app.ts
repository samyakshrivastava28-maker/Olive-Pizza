import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import orderRoutes from './routes/order.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { backgroundTaskWorker } from './services/background/BackgroundTaskWorker.js';
import aiRoutes from './routes/ai.routes.js';
import deliveryRoutes from './routes/delivery.routes.js';
import userRoutes from './routes/user.routes.js';
import menuRoutes from './routes/menu.routes.js';
import reportRoutes from './routes/report.routes.js';
import mediaRoutes from './routes/media.routes.js';
import couponRoutes from './routes/coupon.routes.js';
import trackingRoutes from './routes/tracking.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import authRoutes from './routes/auth.routes.js';
import heartbeatRoutes from './routes/heartbeat.routes.js';
import seoRoutes from './routes/seo.routes.js';
import versionRoutes from './routes/version.routes.js';
import githubRoutes from './routes/github.routes.js';
import phoneVerificationRoutes from './routes/phoneVerification.routes.js';
import devopsRoutes from './routes/devops.routes.js';
import ttsRoutes from './routes/tts.routes.js';
import pageBuilderRoutes from './routes/pageBuilder.routes.js';
import { versionCheck } from './middleware/versionCheck.js';
import { 
  authLimiter, 
  otpLimiter, 
  publicLimiter, 
  userLimiter, 
  adminLimiter, 
  expensiveLimiter 
} from './config/security.config.js';

const app = express();
app.set('trust proxy', 1);

// ── PRODUCTION SECURITY HEADERS (HELMET HARDENING) ───────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://*.googleusercontent.com", "https://tiles.openfreemap.org", "https://*.cartocdn.com", "https://*.tile.openstreetmap.org"],
      connectSrc: ["'self'", "https://*.firebaseio.com", "https://*.googleapis.com", "https://*.supabase.co", "wss://*.supabase.co", "https://integrate.api.nvidia.com", "https://tiles.openfreemap.org", "https://*.cartocdn.com", "https://*.tile.openstreetmap.org"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' }, // X-Frame-Options: DENY
  noSniff: true,                 // X-Content-Type-Options: nosniff
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
}));

// ── STRICT CORS CONFIGURATION ────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost',
  'capacitor://localhost',
  process.env.CLIENT_URL || 'https://olive-pizza.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Restrict JSON Body Payload to 1MB to prevent memory exhaustion / DoS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// API Performance Tracker
app.use((req, res, next) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const elapsed = process.hrtime(start);
    const ms = (elapsed[0] * 1000) + (elapsed[1] / 1e6);
    console.log(`[API TRACE] ${req.method} ${req.originalUrl} -> HTTP ${res.statusCode} (${ms.toFixed(2)}ms)`);
  });
  next();
});
app.use(versionCheck);


import healthRoutes from './routes/health.routes.js';
import healthStreamRoutes from './routes/health.stream.routes.js';

// Exclude health streams from rate limiters
app.use('/health', healthStreamRoutes); // Must go before healthRoutes to catch /health/stream
app.use('/health', healthRoutes);

// ── RATE LIMITING TIER ATTACHMENTS ───────────────────────────────────────────
app.use('/auth', authLimiter);
app.use('/phone', authLimiter);
app.use('/phone/send-otp', otpLimiter);

app.use('/menu', publicLimiter);
app.use('/seo', publicLimiter);

app.use('/orders', userLimiter);
app.use('/users', userLimiter);
app.use('/tracking', userLimiter);

app.use('/admin', adminLimiter);
app.use('/delivery', adminLimiter);
app.use('/data-manager', adminLimiter);

app.use('/ai', expensiveLimiter);
app.use('/api/ai', expensiveLimiter);
app.use('/reports', expensiveLimiter);
app.use('/google-drive', expensiveLimiter);
app.use('/notifications/send-custom', expensiveLimiter);
app.use('/tts', expensiveLimiter);
app.use('/api/tts', expensiveLimiter);


app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import emailRoutes from './routes/email.routes.js';
import googleDriveRoutes from './routes/googleDrive.routes.js';
import aiKnowledgeRoutes from './routes/aiKnowledge.routes.js';
import dataManagerRoutes from './routes/dataManager.routes.js';
import aiIntegrationRoutes from './routes/aiIntegration.routes.js';

app.use('/orders', orderRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/order', orderRoutes);

app.use('/api/integration/ai', aiIntegrationRoutes);
// Alias for AI management dashboard — convenient for admin panels
app.use('/api/ai/management', aiIntegrationRoutes);

app.use('/admin', adminRoutes);
app.use('/api/admin', adminRoutes);

app.use('/page-builder', pageBuilderRoutes);
app.use('/api/page-builder', pageBuilderRoutes);

app.use('/ai', aiRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai', aiKnowledgeRoutes);

app.use('/delivery', deliveryRoutes);
app.use('/api/delivery', deliveryRoutes);

app.use('/users', userRoutes);
app.use('/api/users', userRoutes);

app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

app.use('/menu', menuRoutes);
app.use('/api/menu', menuRoutes);

app.use('/reports', reportRoutes);
app.use('/api/reports', reportRoutes);

app.use('/notifications', notificationRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('/media', mediaRoutes);
app.use('/api/media', mediaRoutes);

app.use('/coupons', couponRoutes);
app.use('/api/coupons', couponRoutes);

app.use('/tracking', trackingRoutes);
app.use('/api/tracking', trackingRoutes);

app.use('/email', emailRoutes);
app.use('/api/email', emailRoutes);

app.use('/heartbeat', heartbeatRoutes);
app.use('/api/heartbeat', heartbeatRoutes);

app.use('/version', versionRoutes);
app.use('/api/version', versionRoutes);

app.use('/github', githubRoutes);
app.use('/api/github', githubRoutes);

app.use('/phone', phoneVerificationRoutes);
app.use('/api/phone', phoneVerificationRoutes);

app.use('/data-manager', dataManagerRoutes);
app.use('/api/data-manager', dataManagerRoutes);

app.use('/devops', devopsRoutes);
app.use('/api/devops', devopsRoutes);

import paymentRoutes from './routes/payment.routes.js';
import { PaymentReconciliationService } from './services/payment/PaymentReconciliationService.js';

app.use('/payment', paymentRoutes);
app.use('/api/payment', paymentRoutes);

import websiteManagerRoutes from './routes/websiteManager.routes.js';
import ownerAIRoutes from './routes/ownerAI.routes.js';
import websiteAnalyticsRoutes from './routes/websiteAnalytics.routes.js';
import mediaLibraryRoutes from './routes/mediaLibrary.routes.js';
import stitchRoutes from './routes/stitch.routes.js';

app.use('/website-manager', websiteManagerRoutes);
app.use('/api/website-manager', websiteManagerRoutes);

app.use('/owner-ai', ownerAIRoutes);
app.use('/api/owner-ai', ownerAIRoutes);

app.use('/website-analytics', websiteAnalyticsRoutes);
app.use('/api/website-analytics', websiteAnalyticsRoutes);

app.use('/media-library', mediaLibraryRoutes);
app.use('/api/media-library', mediaLibraryRoutes);

app.use('/stitch', stitchRoutes);
app.use('/api/stitch', stitchRoutes);

import designStudioRoutes from './routes/designStudio.routes.js';
import knowledgeRoutes from './routes/knowledge.routes.js';
app.use('/design-studio', designStudioRoutes);
app.use('/api/design-studio', designStudioRoutes);

app.use('/knowledge', knowledgeRoutes);
app.use('/api/knowledge', knowledgeRoutes);

// Start background payment reconciliation cron job
PaymentReconciliationService.startCronJob();

app.use('/tts', ttsRoutes);
app.use('/api/tts', ttsRoutes);

// SEO Routes
app.use('/', seoRoutes);

// 404 Handler - MUST return JSON to prevent HTML fallback for API routes
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ success: false, error: 'Route not found', code: 'NOT_FOUND' });
});

// Global Error Handler - SANITIZES 500 INTERNAL ERRORS IN PRODUCTION
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const isProd = process.env.NODE_ENV === 'production';
  console.error(`[Global Error][${new Date().toISOString()}][${req.method} ${req.url}]`, err.message || err);

  const statusCode = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;

  res.status(statusCode).json({
    success: false,
    error: isProd && statusCode === 500 ? 'An unexpected error occurred. Please try again later.' : (err.message || 'Internal Server Error'),
    code: err.code || 'INTERNAL_ERROR',
    ...(isProd ? {} : { stack: err.stack })
  });
});

export default app;
