import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'notifications.jsonl');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export interface NotificationLogEntry {
  timestamp: string;
  orderId?: string;
  userId?: string;
  role?: string;
  triggerSource?: 'manual' | 'automatic';
  eventType?: string;
  recipientRole?: string;
  recipientCount?: number;
  activeTokenCount?: number;
  inactiveTokenCount?: number;
  fcmToken: string;
  payload: any;
  firebaseResponse: any;
  status: 'success' | 'failure';
  errorDetails?: string;
  elapsedTimeMs: number;
  retryCount?: number;
  retryReason?: string;
}

export class NotificationLogger {
  static log(entry: NotificationLogEntry) {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(LOG_FILE, logLine);
      
      if (entry.status === 'failure') {
        console.warn(`⚠️ [FCM Failure] Target: ${entry.userId} (${entry.fcmToken}) - Reason: ${entry.errorDetails}`);
      }
    } catch (e) {
      console.error('❌ Failed to write to notification logger:', e);
    }
  }

  static getRecentLogs(limit = 100): NotificationLogEntry[] {
    try {
      if (!fs.existsSync(LOG_FILE)) return [];
      const lines = fs.readFileSync(LOG_FILE, 'utf-8').trim().split('\n');
      return lines.slice(-limit).filter(l => l).map(line => JSON.parse(line)).reverse();
    } catch (e) {
      return [];
    }
  }
}
