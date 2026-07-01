import { pgPool } from '../config/postgres.js';
import { adminDb as db } from '../config/firebase.js';
import cron from 'node-cron';

export class DataRetentionJob {
  public static async run(): Promise<void> {
    console.log('[DataRetentionJob] Starting cleanup...');
    const client = await pgPool.connect();
    
    try {
      // 1. Notification Cleanup: Keep only today & yesterday
      await client.query(`
        DELETE FROM notification_history 
        WHERE created_at < CURRENT_DATE - INTERVAL '1 day';
      `);
      
      // 2. Clear stuck notification queue items older than 6 hours
      await client.query(`
        DELETE FROM notification_queue 
        WHERE created_at < NOW() - INTERVAL '6 hours';
      `);
      
      // 3. Heartbeat Cleanup: Remove devices offline > 7 days
      await client.query(`
        DELETE FROM device_heartbeats
        WHERE last_seen < NOW() - INTERVAL '7 days';
      `);
      
      // 4. GPS Cleanup: Delete tracking coordinates 5 mins after delivery
      await client.query(`
        DELETE FROM active_deliveries
        WHERE order_id IN (
          SELECT id FROM orders 
          WHERE status IN ('delivered', 'cancelled') 
          AND updated_at < NOW() - INTERVAL '5 minutes'
        );
      `);
      
      // 5. Order Retention: Keep current and previous month only
      await client.query(`
        DELETE FROM orders
        WHERE created_at < date_trunc('month', CURRENT_DATE) - INTERVAL '1 month';
      `);
      
      // Note: order_items deleted via CASCADE

      // 6. Firebase temporary data cleanup (if any)
      // E.g., expired sessions or anything left in firestore.
      
      console.log(`[DataRetentionJob] Cleanup completed successfully.`);
    } catch (err) {
      console.error('[DataRetentionJob] Failed:', err);
    } finally {
      client.release();
    }
  }

  public static schedule() {
    // Run daily at 2:00 AM
    cron.schedule('0 2 * * *', () => {
      DataRetentionJob.run();
    });
  }
}
