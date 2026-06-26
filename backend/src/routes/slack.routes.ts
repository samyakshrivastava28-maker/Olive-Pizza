import { Router } from 'express';
import { adminDb as db } from '../config/firebase.js';
import { notificationService } from '../services/notification/notification.service.js';
import { slackProvider } from '../services/notification/slack.provider.js';
import crypto from 'crypto';

const router = Router();

// ─── Slack Signature Verification ────────────────────────────────────────────
const verifySlackRequest = (req: any, res: any, next: any) => {
  const slackSignature = req.headers['x-slack-signature'] as string;
  const slackTimestamp = req.headers['x-slack-request-timestamp'] as string;
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (!signingSecret) {
    // Dev-mode: bypass verification if secret not configured
    return next();
  }

  if (!slackSignature || !slackTimestamp) {
    return res.status(401).send('Verification failed: missing headers');
  }

  // Prevent replay attacks (5 min window)
  const time = Math.floor(Date.now() / 1000);
  if (Math.abs(time - parseInt(slackTimestamp, 10)) > 60 * 5) {
    return res.status(401).send('Request too old');
  }

  if (!req.rawBody) {
    return next(); // rawBody not captured — skip strict verify in dev
  }

  const sigBasestring = `v0:${slackTimestamp}:${req.rawBody}`;
  const mySignature = `v0=${crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring, 'utf8')
    .digest('hex')}`;

  if (
    mySignature.length === slackSignature.length &&
    crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(slackSignature))
  ) {
    next();
  } else {
    res.status(401).send('Verification failed: signature mismatch');
  }
};

// ─── GET /slack/status ────────────────────────────────────────────────────────
// Returns live connection status and workspace info
router.get('/status', async (_req, res) => {
  try {
    const info = await slackProvider.testConnection();
    res.json(info);
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

// ─── POST /slack/test ─────────────────────────────────────────────────────────
// Sends the test success notification from the Owner dashboard
router.post('/test', async (_req, res) => {
  try {
    const connInfo = await slackProvider.testConnection();
    if (!connInfo.ok) {
      return res.status(500).json({ error: connInfo.error || 'Slack not connected' });
    }

    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    const blocks = [
      {
        type: 'header',
        text: { type: 'plain_text', text: '✅ Olive Pizza Slack Integration Working Successfully', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Time:*\n${now} IST` },
          { type: 'mrkdwn', text: `*Environment:*\n${process.env.NODE_ENV || 'development'}` },
          { type: 'mrkdwn', text: `*Workspace:*\n${connInfo.workspaceName}` },
          { type: 'mrkdwn', text: `*Bot:*\n@${connInfo.botName}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '🍕 *Olive Pizza* notification system is fully operational. All alerts will be delivered to their configured channels.' },
      },
    ];

    const ts = await notificationService.dispatchImmediate({
      type: 'system_test',
      category: 'general',
      title: 'Slack Integration Test',
      blocks,
    });

    res.json({ success: true, ts, workspace: connInfo.workspaceName, bot: connInfo.botName });
  } catch (err) {
    console.error('[Slack Test]', err);
    res.status(500).json({ error: 'Failed to send test message' });
  }
});

// ─── POST /slack/announce ─────────────────────────────────────────────────────
// Owner sends a custom announcement from the dashboard
router.post('/announce', async (req, res) => {
  const { message, channel } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const blocks = [
      {
        type: 'header',
        text: { type: 'plain_text', text: '📢 Announcement from Olive Pizza', emoji: true },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: message },
      },
    ];

    const ts = await notificationService.dispatchImmediate({
      type: 'owner_announcement',
      category: channel || 'general',
      title: 'Owner Announcement',
      blocks,
    });

    res.json({ success: true, ts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send announcement' });
  }
});

// ─── POST /slack/interactions ─────────────────────────────────────────────────
// Handles interactive button presses from Slack (Accept, Cancel, Pickup, Deliver, Problem)
router.post('/interactions', verifySlackRequest, async (req, res) => {
  if (!req.body.payload) return res.status(400).send('No payload');

  const payload = JSON.parse(req.body.payload);
  res.status(200).send(); // Acknowledge within 3 seconds

  if (payload.type !== 'block_actions') return;

  const action = payload.actions?.[0];
  if (!action) return;

  const user = payload.user?.username || 'Slack User';
  const actionId: string = action.action_id;
  const value: string = action.value || '';

  try {
    // ── Owner: Accept Order ──────────────────────────────────────────────────
    if (actionId === 'action_accept_order') {
      const orderId = value.replace('accept_order_', '');
      await db.collection('orders').doc(orderId).update({ status: 'accepted', updatedAt: new Date() });
      console.log(`✅ Order ${orderId} accepted by @${user} via Slack`);
    }

    // ── Owner: Cancel Order ──────────────────────────────────────────────────
    else if (actionId === 'action_cancel_order') {
      const orderId = value.replace('cancel_order_', '');
      await db.collection('orders').doc(orderId).update({ status: 'cancelled', updatedAt: new Date() });
      console.log(`❌ Order ${orderId} cancelled by @${user} via Slack`);
    }

    // ── Delivery: Mark Picked Up ─────────────────────────────────────────────
    else if (actionId === 'action_pickup_order') {
      const orderId = value.replace('pickup_', '');
      await db.collection('orders').doc(orderId).update({ status: 'out_for_delivery', updatedAt: new Date() });
      console.log(`📦 Order ${orderId} picked up by @${user} via Slack`);
    }

    // ── Delivery: Mark Delivered ─────────────────────────────────────────────
    else if (actionId === 'action_deliver_order') {
      const orderId = value.replace('deliver_', '');
      await db.collection('orders').doc(orderId).update({ status: 'delivered', updatedAt: new Date() });
      console.log(`🎉 Order ${orderId} delivered by @${user} via Slack`);
    }

    // ── Delivery: Report Problem ─────────────────────────────────────────────
    else if (actionId === 'action_delivery_problem') {
      const orderId = value.replace('problem_', '');
      await notificationService.dispatchImmediate({
        type: 'delivery_problem',
        category: 'delivery',
        title: `⚠️ Delivery Problem Reported`,
        details: `Delivery partner @${user} reported a problem on order #${orderId.slice(-6).toUpperCase()}. Immediate attention required.`,
      });
      console.log(`⚠️ Problem on order ${orderId} reported by @${user} via Slack`);
    }
  } catch (err) {
    console.error('[Slack Interaction Error]', err);
  }
});

export default router;
