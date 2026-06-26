import express from 'express';
import { queueEmail, transporter } from '../services/email.service.js';
import { pgPool } from '../config/postgres.js';
import dotenv from 'dotenv';
import { adminAuth } from '../config/firebase.js';

dotenv.config();

// ─── Olive Pizza Brand Assets ───────────────────────────────────────────────
const LOGO_URL = 'https://res.cloudinary.com/dxmlvkff1/image/upload/v1782376898/olive-pizza/brand/logo.png';
const BRAND_COLOR = '#f97316';
const BRAND_DARK = '#0B0F14';
const BRAND_FOOTER_BG = '#1E293B';

// ─── Email Header with Real Logo ─────────────────────────────────────────────
const EMAIL_HEADER = `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND_DARK};">
    <tr>
      <td align="center" style="padding: 28px 20px 20px;">
        <img
          src="${LOGO_URL}"
          alt="Olive Pizza Logo"
          width="72"
          height="72"
          style="display: block; border-radius: 16px; margin-bottom: 10px;"
        />
        <div style="color: ${BRAND_COLOR}; font-family: Arial, sans-serif; font-size: 22px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">
          Olive Pizza
        </div>
        <div style="color: #94a3b8; font-family: Arial, sans-serif; font-size: 12px; margin-top: 4px; letter-spacing: 1px;">
          Premium Pizza Delivery · Rajnandgaon
        </div>
      </td>
    </tr>
  </table>
`;

// ─── Email Footer ─────────────────────────────────────────────────────────────
const EMAIL_FOOTER = `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND_FOOTER_BG};">
    <tr>
      <td align="center" style="padding: 20px; color: #64748b; font-family: Arial, sans-serif; font-size: 11px; line-height: 1.6;">
        <img src="${LOGO_URL}" alt="Olive Pizza" width="32" height="32" style="border-radius: 8px; margin-bottom: 8px; display: block; margin-left: auto; margin-right: auto;" />
        <div>Olive Pizza | Dongargaon Rd, near Saraswati School, Gokul Nagar</div>
        <div>Rajnandgaon, Chhattisgarh 491441</div>
        <div style="margin-top: 6px;">
          <a href="https://olivepizza.app/menu" style="color: ${BRAND_COLOR}; text-decoration: none; margin: 0 8px;">Order Now</a>
          <span style="color: #334155;">|</span>
          <a href="https://olivepizza.app" style="color: ${BRAND_COLOR}; text-decoration: none; margin: 0 8px;">Website</a>
        </div>
        <div style="margin-top: 8px; color: #475569;">© ${new Date().getFullYear()} Olive Pizza. All rights reserved.</div>
      </td>
    </tr>
  </table>
`;

// ─── Full Email Wrapper ───────────────────────────────────────────────────────
const wrapper = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Olive Pizza</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 24px 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
          <tr><td>${EMAIL_HEADER}</td></tr>
          <tr>
            <td style="background-color: #ffffff; padding: 32px 36px; font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6;">
              ${content}
            </td>
          </tr>
          <tr><td>${EMAIL_FOOTER}</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const router = express.Router();

// 1. Transactional Triggers
router.post('/transactional', async (req, res) => {
  try {
    const { event, data } = req.body;
    
    // Default Owner Email for notifications
    const ownerEmail = process.env.OWNER_EMAIL || 'webhub2811@gmail.com';
    
    if (event === 'REGISTER') {
      // Welcome Email to Customer
      await queueEmail(
        data.email,
        'Welcome to Olive Pizza! 🍕',
        wrapper(`
          <h2 style="color: #0f172a;">Welcome, ${data.name || 'Pizza Lover'}!</h2>
          <p>Thank you for joining Olive Pizza. We are thrilled to have you.</p>
          <p>Get ready to experience the most premium pizzas in Rajnandgaon.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://olivepizza.app/menu" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Order Now</a>
          </div>
        `),
        'transactional'
      );

      // Notification to Owner
      await queueEmail(
        ownerEmail,
        '🔔 New User Registration',
        wrapper(`
          <h3>New Customer Registered</h3>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
        `),
        'transactional'
      );
    }
    
    else if (event === 'ORDER_PLACED') {
      const orderHtml = `
        <h3>Order #${data.orderId.slice(-6).toUpperCase()}</h3>
        <p>Your order has been successfully placed and is pending restaurant confirmation.</p>
        <p><strong>Total:</strong> ₹${data.totalAmount}</p>
        <p><strong>Delivery Method:</strong> ${data.deliveryType}</p>
      `;

      // To Customer
      if (data.customerEmail) {
        await queueEmail(data.customerEmail, 'Order Received - Olive Pizza', wrapper(orderHtml), 'transactional');
      }

      // To Owner
      await queueEmail(
        ownerEmail,
        `🔔 New Order Placed (#${data.orderId.slice(-6).toUpperCase()})`,
        wrapper(`
          <h3>New Order Alert</h3>
          <p><strong>Customer:</strong> ${data.customerName}</p>
          <p><strong>Total:</strong> ₹${data.totalAmount}</p>
          <p><a href="https://olivepizza.app/owner/dashboard">View in Dashboard</a></p>
        `),
        'transactional'
      );
    }

    else if (event === 'ORDER_STATUS_CHANGED') {
      if (!data.customerEmail) return res.json({ success: true, message: 'No customer email provided' });

      let subject = '';
      let content = '';

      if (data.status === 'preparing') {
        subject = 'Your Pizza is in the Oven! 🔥';
        content = `<h3>Good news!</h3><p>Your order #${data.orderId.slice(-6).toUpperCase()} is now being prepared by our chefs.</p>`;
      } else if (data.status === 'out_for_delivery') {
        subject = 'Your Pizza is Out for Delivery! 🛵';
        content = `
          <h3>It's on the way!</h3>
          <p>Your order is out for delivery. Our partner will arrive soon.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://olivepizza.app/tracking/${data.orderId}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Track Live</a>
          </div>
        `;
      } else if (data.status === 'delivered') {
        subject = 'Order Delivered! 🎉';
        content = `
          <h3>Thank you for ordering!</h3>
          <p>Your order #${data.orderId.slice(-6).toUpperCase()} has been delivered.</p>
          <p>We hope you enjoy your meal. Please leave us a rating!</p>
        `;
        // Notification to Owner
        await queueEmail(
          ownerEmail,
          `✅ Delivery Completed (#${data.orderId.slice(-6).toUpperCase()})`,
          wrapper(`<p>Order #${data.orderId.slice(-6).toUpperCase()} was successfully delivered to ${data.customerName || 'Customer'}.</p>`),
          'transactional'
        );
      } else if (data.status === 'cancelled') {
        subject = 'Order Cancelled';
        content = `<h3>Order Update</h3><p>Your order #${data.orderId.slice(-6).toUpperCase()} has been cancelled. If you have any questions, please contact us.</p>`;
        
        // Notify owner too
        await queueEmail(ownerEmail, `⚠️ Order Cancelled (#${data.orderId.slice(-6).toUpperCase()})`, wrapper(content), 'transactional');
      }

      if (subject && content) {
        await queueEmail(data.customerEmail, subject, wrapper(content), 'transactional');
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Trigger Email Error:', error);
    res.status(500).json({ error: 'Failed to process trigger' });
  }
});

// ─── Owner Tools ──────────────────────────────────────────────────────────────

router.post('/preview', (req, res) => {
  try {
    const { htmlContent } = req.body;
    res.send(wrapper(htmlContent || '<p>No content provided</p>'));
  } catch (error) {
    res.status(500).send('Preview generation failed');
  }
});

router.post('/test', async (req, res) => {
  try {
    const { htmlContent, subject, recipient } = req.body;
    const testRecipient = recipient || 'olivepizzarjn@gmail.com';
    
    await transporter.sendMail({
      from: `"Olive Pizza" <${process.env.SMTP_USER}>`,
      to: testRecipient,
      subject: subject || 'Test Email from Owner Dashboard',
      html: wrapper(htmlContent || '<p>Test Email Content</p>'),
    });
    
    res.json({ success: true, message: `Test email sent to ${testRecipient}` });
  } catch (error: any) {
    console.error('Test email failed:', error);
    res.status(500).json({ error: error.message || 'Failed to send test email' });
  }
});

// ─── Direct Send ──────────────────────────────────────────────────────────────Auth Emails
router.post('/auth/welcome', async (req, res) => {
  try {
    const { email, name, isReturning } = req.body;
    if (isReturning) {
      await queueEmail(email, 'Welcome back to Olive Pizza!', wrapper(`<h2>Welcome Back, ${name || 'Pizza Lover'}!</h2><p>Ready for another delicious pizza?</p>`), 'transactional');
    } else {
      await queueEmail(email, 'Welcome to Olive Pizza! 🍕', wrapper(`<h2>Welcome, ${name || 'Pizza Lover'}!</h2><p>Thank you for joining Olive Pizza.</p>`), 'transactional');
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send welcome email' });
  }
});

router.post('/auth/reset', async (req, res) => {
  try {
    const { email } = req.body;
    const link = await adminAuth.generatePasswordResetLink(email);
    await queueEmail(email, 'Password Reset Request', wrapper(`
      <h2>Reset Your Password</h2>
      <p>Click the link below to reset your Olive Pizza account password:</p>
      <a href="${link}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Reset Password</a>
    `), 'transactional');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send reset email' });
  }
});

router.post('/auth/verify', async (req, res) => {
  try {
    const { email } = req.body;
    const link = await adminAuth.generateEmailVerificationLink(email);
    await queueEmail(email, 'Verify your email address', wrapper(`
      <h2>Verify Email</h2>
      <p>Click the link below to verify your Olive Pizza account:</p>
      <a href="${link}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Verify Email</a>
    `), 'transactional');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// 2. Fetch Templates
router.get('/templates', async (req, res) => {
  try {
    const result = await pgPool.query('SELECT * FROM email_templates ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// 3. Create Campaign
router.post('/campaigns', async (req, res) => {
  try {
    const { name, targetAudience, subject, htmlContent, isFestival } = req.body;
    
    // First save the template
    const templateQuery = `
      INSERT INTO email_templates (name, type, subject, html_content, is_festival)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const templateResult = await pgPool.query(templateQuery, [name, 'marketing', subject, htmlContent, isFestival || false]);
    const templateId = templateResult.rows[0].id;

    // Create Campaign
    const campaignQuery = `
      INSERT INTO email_campaigns (name, target_audience, template_id, status)
      VALUES ($1, $2, $3, 'processing')
      RETURNING id
    `;
    const campaignResult = await pgPool.query(campaignQuery, [name, targetAudience, templateId]);
    const campaignId = campaignResult.rows[0].id;

    // Process Audience & Dispatch (Background)
    (async () => {
      try {
        let emails: string[] = [];
        const { getFirestore } = await import('firebase-admin/firestore');
        const adminDb = getFirestore();
        const usersSnap = await adminDb.collection('users').get();
        
        usersSnap.forEach(doc => {
          const u = doc.data();
          if (!u.email) return;
          
          if (targetAudience === 'all') emails.push(u.email);
          else if (targetAudience === 'new') {
            const daysSinceJoin = (Date.now() - (u.createdAt?.toDate()?.getTime() || 0)) / (1000 * 3600 * 24);
            if (daysSinceJoin <= 30) emails.push(u.email);
          }
          else if (targetAudience === 'active' || targetAudience === 'vip') {
            if (u.ordersCount > (targetAudience === 'vip' ? 10 : 0)) emails.push(u.email);
          }
        });

        // Dedup and send
        emails = [...new Set(emails)];
        
        let sentCount = 0;
        let failCount = 0;

        for (const email of emails) {
          try {
            // Inject Tracking Pixel
            const trackedHtml = htmlContent + `<img src="https://olivepizza.app/api/email/track/open/${campaignId}" width="1" height="1" style="display:none;" />`;
            await queueEmail(email, subject, wrapper(trackedHtml), 'marketing');
            sentCount++;
          } catch (e) {
            failCount++;
          }
        }

        await pgPool.query(
          'UPDATE email_campaigns SET status = $1, sent_count = $2, fail_count = $3 WHERE id = $4',
          ['completed', sentCount, failCount, campaignId]
        );
      } catch (err) {
        console.error('Campaign Dispatch Error:', err);
        await pgPool.query('UPDATE email_campaigns SET status = $1 WHERE id = $2', ['failed', campaignId]);
      }
    })();

    res.json({ success: true, campaignId });
  } catch (error) {
    console.error('Campaign Creation Error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// 4. Analytics
router.get('/analytics', async (req, res) => {
  try {
    const metricsResult = await pgPool.query(`
      SELECT 
        COUNT(*) as total_sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as total_failed
      FROM email_queue
    `);
    
    const campaignsResult = await pgPool.query(`
      SELECT * FROM email_campaigns ORDER BY created_at DESC LIMIT 10
    `);

    res.json({
      metrics: {
        totalSent: parseInt(metricsResult.rows[0].total_sent) || 0,
        totalFailed: parseInt(metricsResult.rows[0].total_failed) || 0,
      },
      campaigns: campaignsResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch email analytics' });
  }
});

// 5. Tracking Endpoints
router.get('/track/open/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    // Update open count in campaigns table
    await pgPool.query(
      'UPDATE email_campaigns SET open_count = open_count + 1 WHERE id = $1',
      [campaignId]
    );
    // Return a 1x1 transparent tracking pixel
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private'
    });
    res.end(pixel);
  } catch (error) {
    res.status(500).end();
  }
});

router.get('/track/click/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { url } = req.query;
    
    // Update click count in campaigns table
    await pgPool.query(
      'UPDATE email_campaigns SET click_count = COALESCE(click_count, 0) + 1 WHERE id = $1',
      [campaignId]
    );
    
    if (url && typeof url === 'string') {
      return res.redirect(url);
    }
    res.redirect('https://olivepizza.app');
  } catch (error) {
    res.redirect('https://olivepizza.app');
  }
});

export default router;
