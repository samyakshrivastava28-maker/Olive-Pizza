import { Router } from 'express';
import { pgPool } from '../config/postgres.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/metrics', requireAuth, requireRole(['owner', 'admin']), async (req, res) => {
  const client = await pgPool.connect();
  try {
    const metrics: any = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    // DB Size Estimate
    const dbSizeRes = await client.query(`SELECT pg_size_pretty(pg_database_size(current_database())) as size;`);
    metrics.dbSize = dbSizeRes.rows[0]?.size || 'Unknown';

    // Active Users
    const activeUsersRes = await client.query(`SELECT COUNT(*) as count FROM device_heartbeats WHERE is_online = true;`);
    metrics.activeUsers = parseInt(activeUsersRes.rows[0]?.count || '0', 10);

    // Queue Size
    const queueSizeRes = await client.query(`SELECT COUNT(*) as count FROM notification_queue;`);
    metrics.notificationQueueSize = parseInt(queueSizeRes.rows[0]?.count || '0', 10);

    // Deliveries
    const deliveriesRes = await client.query(`SELECT COUNT(*) as count FROM active_deliveries;`);
    metrics.activeDeliveries = parseInt(deliveriesRes.rows[0]?.count || '0', 10);

    res.json({ success: true, metrics });
  } catch (error) {
    console.error('Health metrics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch metrics' });
  } finally {
    client.release();
  }
});

export default router;
