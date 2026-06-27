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

  // Process Scheduled Orders every minute
  cron.schedule('* * * * *', async () => {
    try {
      const { adminDb } = await import('../config/firebase.js');
      const now = new Date();
      const snapshot = await adminDb.collection('orders')
        .where('orderTiming', '==', 'scheduled')
        .where('alertSent', '==', false)
        .where('status', 'in', ['pending', 'accepted'])
        .get();

      const PREP_TIME_MINUTES = 45; // Delay alarm until 45 minutes before scheduled time

      snapshot.docs.forEach(async (doc) => {
        const data = doc.data();
        if (!data.scheduledDate || !data.scheduledTime) return;

        // Parse scheduled time
        const targetDate = new Date();
        if (data.scheduledDate === 'tomorrow') {
          targetDate.setDate(targetDate.getDate() + 1);
        }

        const timeStr = data.scheduledTime; // e.g. "6:30 PM"
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        targetDate.setHours(hours, minutes, 0, 0);

        const diffMinutes = (targetDate.getTime() - now.getTime()) / (1000 * 60);

        // If we are within the prep time (e.g. 45 mins) of the scheduled time
        if (diffMinutes <= PREP_TIME_MINUTES && diffMinutes > -60) {
          console.log(`⏰ Triggering scheduled order alarm for ${doc.id}`);
          await adminDb.collection('orders').doc(doc.id).update({
            alertSent: true,
            status: 'accepted' // Auto-accept to start kitchen process
          });
        }
      });
    } catch (error) {
      console.error('Failed to process scheduled orders:', error);
    }
  });

  console.log('Scheduler initialized.');
}
