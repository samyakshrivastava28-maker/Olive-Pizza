import * as dotenv from 'dotenv';
dotenv.config(); // defaults to backend/.env
import { notificationQueue } from './src/services/notification/NotificationQueueService.js';
import { pgPool } from './src/config/postgres.js';

async function run() {
  console.log('Running processQueue test...');
  try {
    const res = await pgPool.query('SELECT * FROM notification_history WHERE status=\'failed\' AND target_user_id = \'2a0bab7e-d458-4299-a6a1-b796bce836f9\' ORDER BY created_at DESC LIMIT 1');
    console.log('Re-queueing items for valid user:', res.rowCount);
    
    const items = res.rows;
    for (const item of items) {
      const payload = {
        notification: { title: item.title, body: item.body },
        data: { tag: item.tag, orderId: item.order_id, version: item.version, category: item.category }
      };
      await pgPool.query(
        'INSERT INTO notification_queue (target_user_id, payload, status, category, priority, retry_count) VALUES ($1, $2, $3, $4, $5, 0)', 
        [item.target_user_id, JSON.stringify(payload), 'queued', item.category, 'normal']
      );
    }
    
    await notificationQueue.processQueue();
    console.log('Finished processQueue().');
    
    const failed = await pgPool.query('SELECT * FROM notification_history WHERE status=\'failed\' ORDER BY created_at DESC LIMIT 2');
    console.log('Last 2 failed items:', failed.rows);
  } catch (e) {
    console.error('Error during processQueue():', e);
  }
  process.exit(0);
}
run();
