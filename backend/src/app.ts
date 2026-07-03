import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import orderRoutes from './routes/order.routes.js';
import adminRoutes from './routes/admin.routes.js';
import aiRoutes from './routes/ai.routes.js';
import deliveryRoutes from './routes/delivery.routes.js';
import userRoutes from './routes/user.routes.js';
import menuRoutes from './routes/menu.routes.js';
import reportRoutes from './routes/report.routes.js';
import mediaRoutes from './routes/media.routes.js';
import couponRoutes from './routes/coupon.routes.js';
import trackingRoutes from './routes/tracking.routes.js';
import slackRoutes from './routes/slack.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import authRoutes from './routes/auth.routes.js';
import heartbeatRoutes from './routes/heartbeat.routes.js';
import seoRoutes from './routes/seo.routes.js';
import versionRoutes from './routes/version.routes.js';
import { versionCheck } from './middleware/versionCheck.js';

const app = express();

app.use(helmet());
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
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
app.use(express.json());
app.use(versionCheck);

import debugRoutes from './routes/debug.routes.js';
import healthRoutes from './routes/health.routes.js';
import healthStreamRoutes from './routes/health.stream.routes.js';

// Exclude health streams from global rate limit
app.use('/health', healthStreamRoutes); // Must go before healthRoutes to catch /health/stream
app.use('/health', healthRoutes);
app.use('/system/debug', debugRoutes);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/', apiLimiter);

// Strict Rate Limiting
const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 }); // 5 requests per minute
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 }); // 20 requests per minute
const couponLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 }); // 30 requests per minute

app.use('/users/login', authLimiter);
app.use('/ai', aiLimiter);
app.use('/coupons/validate', couponLimiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import emailRoutes from './routes/email.routes.js';
import googleDriveRoutes from './routes/googleDrive.routes.js';

app.use('/orders', orderRoutes);
app.use('/admin', adminRoutes);
app.use('/ai', aiRoutes);
app.use('/delivery', deliveryRoutes);
app.use('/users', userRoutes);
app.use('/auth', authRoutes);
app.use('/menu', menuRoutes);
app.use('/reports', reportRoutes);
app.use('/notifications', notificationRoutes);
app.use('/media', mediaRoutes);
app.use('/coupons', couponRoutes);
app.use('/tracking', trackingRoutes);
app.use('/email', emailRoutes);
app.use('/slack', slackRoutes);
app.use('/google-drive', googleDriveRoutes);
app.use('/heartbeat', heartbeatRoutes);
app.use('/version', versionRoutes);

// SEO Routes (mounted at root via app in server.ts, but we map them here)
app.use('/', seoRoutes);

// 404 Handler - MUST return JSON to prevent HTML fallback for API routes
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error]', err.message);
  // Do not expose stack traces in production
  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    success: false,
    error: isProd ? 'Internal Server Error' : err.message,
    details: isProd ? undefined : err.stack
  });
});

export default app;
