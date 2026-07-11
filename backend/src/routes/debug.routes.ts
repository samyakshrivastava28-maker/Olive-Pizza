import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { pgPool } from '../config/postgres.js';
import { adminAuth } from '../config/firebase.js';
import cloudinary from '../config/cloudinary.js';
import os from 'os';

const router = Router();

router.get('/', requireAuth, requireRole(['owner', 'admin']), async (req: Request, res: Response) => {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: os.cpus(),
      loadAvg: os.loadavg(),
    },
    services: {
      database: { status: 'checking', latency: 0 },
      firebase: { status: 'checking', latency: 0 },
      cloudinary: { status: 'checking', latency: 0 },
    }
  };

  // DB
  const dbStart = Date.now();
  try {
    const client = await pgPool.connect();
    const resCount = await client.query('SELECT count(*) FROM pg_stat_activity');
    diagnostics.services.database = {
      status: 'connected',
      latency: Date.now() - dbStart,
      connections: parseInt(resCount.rows[0].count, 10)
    };
    client.release();
  } catch (e: any) {
    diagnostics.services.database = { status: 'error', message: e.message, latency: Date.now() - dbStart };
  }

  // Firebase
  const fbStart = Date.now();
  try {
    if (adminAuth) {
      diagnostics.services.firebase = { status: 'connected', latency: Date.now() - fbStart };
    } else {
      diagnostics.services.firebase = { status: 'error', message: 'Admin Auth not initialized', latency: Date.now() - fbStart };
    }
  } catch (e: any) {
    diagnostics.services.firebase = { status: 'error', message: e.message, latency: Date.now() - fbStart };
  }

  // Cloudinary
  const cldStart = Date.now();
  try {
    const config = cloudinary.config();
    if (config.cloud_name) {
      diagnostics.services.cloudinary = { status: 'connected', latency: Date.now() - cldStart };
    } else {
      diagnostics.services.cloudinary = { status: 'error', message: 'Config missing', latency: Date.now() - cldStart };
    }
  } catch (e: any) {
    diagnostics.services.cloudinary = { status: 'error', message: e.message, latency: Date.now() - cldStart };
  }

  res.json({ success: true, diagnostics });
});

router.post('/test-email', requireAuth, requireRole(['owner', 'admin']), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Target email is required' });
      return;
    }

    const { queueEmail } = require('../services/email.service.js');
    const { buildOrderStatusEmail } = require('../services/emailTemplates.service.js');
    
    const dummyOrderData = {
      order_number: "TEST-999",
      total_amount: 1500,
      subtotal: 1350,
      tax_amount: 100,
      delivery_fee: 50,
      estimated_delivery_time: "30 mins",
      payment_method: "cash",
      delivery_address: {
        fullName: "Test User",
        addressLine1: "123 Debug St",
        city: "Tech City",
        state: "State",
        postalCode: "12345",
        phone: "+91 9999999999"
      },
      items: [
        { product_name: "Test Pizza", quantity: 2, unit_price: 675, image_url: "https://res.cloudinary.com/dxmlvkff1/image/upload/v1/olive-pizza/farmhouse.jpg" }
      ]
    };

    const html = buildOrderStatusEmail({
      customerName: "Admin",
      subject: "Test Email from Olive Pizza",
      stage: "delivered",
      orderId: "TEST-ORDER-ID",
      data: {},
      orderData: dummyOrderData
    });

    await queueEmail({
      to: email,
      subject: "Test Email from Olive Pizza",
      html,
      category: "system_test"
    });

    res.json({ success: true, message: 'Test email queued' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
