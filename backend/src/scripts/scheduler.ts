import cron from 'node-cron';
import { MonthlyReportService } from '../lib/services/MonthlyReportService.js';

export function initScheduler() {
  const reportService = new MonthlyReportService();

  // Schedule to run at 23:59 on days 28-31
  cron.schedule('59 23 28-31 * *', async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // If tomorrow's month is different from today's month, today is the last day of the month
    if (tomorrow.getMonth() !== today.getMonth()) {
      console.log('Detected last day of the month. Triggering automated monthly report generation...');
      try {
        await reportService.generateAndProcessReport(new Date());
      } catch (error) {
        console.error('Scheduled monthly report generation failed:', error);
      }
    }
  });

  // Daily cleanup of old GPS tracking data (older than 24 hours)
  cron.schedule('0 3 * * *', async () => {
    console.log('Running daily cleanup of old delivery locations...');
    try {
      const { pgPool } = await import('../config/postgres.js');
      const client = await pgPool.connect();
      
      // Delete locations updated more than 24 hours ago
      await client.query(`
        DELETE FROM delivery_locations 
        WHERE last_updated < NOW() - INTERVAL '24 hours'
      `);
      
      client.release();
      console.log('Old delivery locations cleanup complete.');
    } catch (error) {
      console.error('Failed to cleanup old locations:', error);
    }
  });

  // Process Email Queue every minute
  cron.schedule('* * * * *', async () => {
    try {
      const { processEmailQueue } = await import('../services/email.service.js');
      await processEmailQueue();
    } catch (error) {
      console.error('Failed to process email queue:', error);
    }
  });

  console.log('Scheduler initialized.');
}
