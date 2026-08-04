import cron from 'node-cron';
import { pgPool } from '../config/postgres.js';

export class DataLifecycleService {
  constructor() {
    this.initCronJobs();
  }

  private initCronJobs() {
    // Run every minute for highly time-sensitive data
    cron.schedule('* * * * *', () => {
      this.runMinutelyCleanup();
    });

    // Run every hour
    cron.schedule('0 * * * *', () => {
      this.runHourlyCleanup();
    });

    // Run every night at 3 AM
    cron.schedule('0 3 * * *', () => {
      this.runNightlyCleanup();
    });
  }

  /**
   * Cleans up GPS data and navigation data strictly every minute
   */
  public async runMinutelyCleanup() {
    const client = await pgPool.connect();
    try {
      // Delete SQL live navigation data for orders that were updated/finished > 5 mins ago
      await client.query(`
        DELETE FROM active_deliveries 
        WHERE order_id::text IN (
          SELECT order_id::text as id FROM background_tasks WHERE status = 'completed' AND finished_at < NOW() - INTERVAL '5 minutes'
        ) OR updated_at < NOW() - INTERVAL '5 minutes'
      `);
    } catch (error) {
      console.error('[DataLifecycle] Error during minutely cleanup:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Cleans up temporary state
   */
  public async runHourlyCleanup() {
    const client = await pgPool.connect();
    try {
      // 1. Clear old heartbeats (older than 24 hours)
      await client.query(`
        DELETE FROM device_heartbeats WHERE last_seen < NOW() - INTERVAL '24 hours'
      `);
      
      // 2. Clear failed queue items older than 24 hours
      await client.query(`
        DELETE FROM notification_queue WHERE status = 'failed' AND updated_at < NOW() - INTERVAL '24 hours'
      `);
      
      console.log('[DataLifecycle] Hourly cleanup completed.');
    } catch (error) {
      console.error('[DataLifecycle] Error during hourly cleanup:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Aggressively prunes history to keep storage < 500MB
   */
  public async runNightlyCleanup() {
    const client = await pgPool.connect();
    try {
      // Keep only 1 week's worth of notifications
      await client.query(`
        DELETE FROM notification_history WHERE created_at < CURRENT_DATE - INTERVAL '7 days'
      `);
      
      console.log('[DataLifecycle] Nightly history pruning completed.');
    } catch (error) {
      console.error('[DataLifecycle] Error during nightly cleanup:', error);
    } finally {
      client.release();
    }
  }
}

export const dataLifecycleService = new DataLifecycleService();
