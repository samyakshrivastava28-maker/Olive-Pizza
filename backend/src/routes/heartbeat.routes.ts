import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { heartbeatService } from '../services/HeartbeatService.js';

const router = Router();

router.post('/', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.uid; // From requireAuth
    await heartbeatService.recordHeartbeat(userId, req.body);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ success: false, error: 'Failed to record heartbeat' });
  }
});

router.get('/devices', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.uid; // From requireAuth
    const devices = await heartbeatService.getActiveDevices(userId);
    res.status(200).json({ success: true, devices });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ success: false, error: 'Failed to get devices' });
  }
});

export default router;
