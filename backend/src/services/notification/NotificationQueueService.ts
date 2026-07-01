import { pgPool } from '../../config/postgres.js';
import { messagingProvider } from './FirebaseMessagingProvider.js';
import { adminDb } from '../../config/firebase.js';

export class NotificationQueueService {
  /**
   * Enqueues a new notification.
   */
  public async enqueue(targetUserId: string, payload: any, priority: 'normal' | 'high' | 'silent' = 'normal'): Promise<string> {
    const client = await pgPool.connect();
    try {
      const result = await client.query(
        `INSERT INTO notification_queue (target_user_id, payload, priority, status)
         VALUES ($1, $2, $3, 'queued') RETURNING id`,
        [targetUserId, JSON.stringify(payload), priority]
      );
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  /**
   * Processes the queue (should be called by a cron job or interval).
   */
  public async processQueue() {
    const client = await pgPool.connect();
    try {
      // Get up to 50 pending notifications (queued or sending/retrying)
      const result = await client.query(
        `SELECT * FROM notification_queue 
         WHERE status IN ('queued', 'sending') 
         ORDER BY priority DESC, created_at ASC 
         LIMIT 50 FOR UPDATE SKIP LOCKED`
      );

      for (const row of result.rows) {
        await this.processItem(row, client);
      }
    } catch (error) {
      console.error('[NotificationQueue] Error processing queue:', error);
    } finally {
      client.release();
    }
  }

  private async processItem(item: any, client: any) {
    const { id, target_user_id, payload, retry_count, priority } = item;

    try {
      // Mark as sending
      await client.query(`UPDATE notification_queue SET status = 'sending' WHERE id = $1`, [id]);

      // Fetch user's FCM tokens
      const userDoc = await adminDb.collection('users').doc(target_user_id).get();
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      const tokens: string[] = userDoc.data()?.fcmTokens || [];

      if (tokens.length === 0) {
        throw new Error('No active FCM tokens for user');
      }

      // Inject notificationId for tracking if needed
      const payloadCopy = typeof payload === 'string' ? JSON.parse(payload) : payload;
      if (payloadCopy.data) {
        payloadCopy.data.notificationId = id;
      } else {
        payloadCopy.data = { notificationId: id };
      }

      // Inject priority if high
      if (priority === 'high') {
        payloadCopy.android = { priority: 'high' };
        payloadCopy.apns = { headers: { 'apns-priority': '10' } };
      }

      if (priority === 'silent') {
        delete payloadCopy.notification; // Strip visible notification object
      }

      // Send via Firebase
      const response = await messagingProvider.sendMulticast(tokens, payloadCopy, id);
      await messagingProvider.cleanupTokens(target_user_id, tokens, response);

      // Successfully sent! (Actual delivery tracked via webhook)
      // Delete immediately from queue (ultra-lightweight requirement)
      await client.query(`DELETE FROM notification_queue WHERE id = $1`, [id]);

      // Add to history
      const title = payloadCopy.notification?.title || 'Notification';
      const body = payloadCopy.notification?.body || '';
      if (title || body) {
        await client.query(
          `INSERT INTO notification_history (target_user_id, title, body, status) VALUES ($1, $2, $3, 'sent')`,
          [target_user_id, title, body]
        );
      }

    } catch (error: any) {
      console.error(`[NotificationQueue] Failed to process item ${id}:`, error);

      const newRetryCount = retry_count + 1;
      if (newRetryCount >= 3) {
        // Mark as failed and delete
        await client.query(`DELETE FROM notification_queue WHERE id = $1`, [id]);

        // Add to history as failed
        const payloadCopy = typeof payload === 'string' ? JSON.parse(payload) : payload;
        const title = payloadCopy.notification?.title || 'Notification';
        const body = payloadCopy.notification?.body || '';
        if (title || body) {
          await client.query(
            `INSERT INTO notification_history (target_user_id, title, body, status) VALUES ($1, $2, $3, 'failed')`,
            [target_user_id, title, body]
          );
        }

        // TODO: Slack Fallback
      } else {
        // Requeue for retry
        await client.query(
          `UPDATE notification_queue SET status = 'queued', retry_count = $1, updated_at = NOW() WHERE id = $2`,
          [newRetryCount, id]
        );
      }
    }
  }
}

export const notificationQueue = new NotificationQueueService();
