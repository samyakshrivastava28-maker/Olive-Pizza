import cron from 'node-cron';
import { monthlyReportService } from '../lib/services/MonthlyReportService.js';

export class MonthlyReportJob {
  private static isScheduled = false;

  public static initCronJob() {
    if (this.isScheduled) return;
    this.isScheduled = true;

    // Run at 00:05 AM on the 1st day of every month
    cron.schedule('5 0 1 * *', async () => {
      console.log('[MonthlyReportJob] Automated 1st of month cron triggered.');
      try {
        await monthlyReportService.generateAndProcessReport();
        console.log('[MonthlyReportJob] Automated monthly report completed successfully.');
      } catch (err: any) {
        console.error('[MonthlyReportJob] Automated cron report generation failed:', err.message);
      }
    });

    console.log('⏰ [MonthlyReportJob] Scheduled for 00:05 AM on the 1st of every month.');
  }
}

export const monthlyReportJob = MonthlyReportJob;
