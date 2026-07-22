import cron from 'node-cron';
import { monthlyReportService } from '../lib/services/MonthlyReportService.js';
import { MonthlyReportJob } from '../jobs/MonthlyReportJob.js';

export function initScheduler() {
  // Initialize monthly report cron (00:05 AM on 1st of month)
  MonthlyReportJob.initCronJob();

  // Also check at 23:59 on days 28-31 for end of month
  cron.schedule('59 23 28-31 * *', async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (tomorrow.getMonth() !== today.getMonth()) {
      console.log('[Scheduler] Detected end of month. Generating report...');
      try {
        await monthlyReportService.generateAndProcessReport(today);
      } catch (error: any) {
        console.error('[Scheduler] Monthly report generation error:', error.message);
      }
    }
  });

  // Daily cleanup of old GPS tracking data (older than 24 hours) at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('[Scheduler] Running daily location cleanup...');
    try {
      const { pgPool } = await import('../config/postgres.js');
      await pgPool.query(`
        DELETE FROM delivery_locations 
        WHERE last_updated < NOW() - INTERVAL '24 hours'
      `).catch(() => {});
      console.log('[Scheduler] Location cleanup completed.');
    } catch (error: any) {
      console.error('[Scheduler] Location cleanup error:', error.message);
    }
  });

  console.log('🗓️ [Scheduler] Automated background schedulers initialized.');
}
