import * as admin from 'firebase-admin';
import { adminMessaging } from '../../config/firebase.js';
import { pgPool } from '../../config/postgres.js';

export interface NotificationOptions {
  tag?: string;
  orderId?: string;
  category?: string;
  priority?: 'normal' | 'high' | 'critical' | 'silent';
  version?: number;
  expiresInSeconds?: number;
}

export class DirectNotificationService {
  /**
   * Instantly push a notification to a single user without queuing.
   */
  public async sendPush(firebaseUserId: string, payload: any, priorityOverride?: 'normal' | 'high' | 'critical' | 'silent', options: NotificationOptions = {}): Promise<any> {
    return await this.sendBulkPush([firebaseUserId], payload, priorityOverride, options);
  }

  /**
   * Instantly push a notification to multiple users, chunking by 500 tokens.
   */
  public async sendBulkPush(firebaseUserIds: string[], payload: any, priorityOverride?: 'normal' | 'high' | 'critical' | 'silent', options: NotificationOptions = {}): Promise<any> {
    if (!firebaseUserIds || firebaseUserIds.length === 0) return { successCount: 0, failureCount: 0, messageIds: [] };

    const client = await pgPool.connect();
    try {
      // 1. Fetch active tokens for all targets
      const tokenRes = await client.query(
        `SELECT user_id as firebase_uid, token 
         FROM fcm_tokens 
         WHERE user_id = ANY($1) AND is_active = TRUE`,
        [firebaseUserIds]
      );

      const tokens = tokenRes.rows.map(r => r.token);
      
      // 2. Ensure Android payload triggers immediately. FCM only supports 'normal' or 'high'.
      // If priority is 'critical' (our internal abstraction), map it to 'high' for Android.
      let priority = priorityOverride || options.priority || 'high';
      if (priority === 'critical' || priority === 'silent') {
        priority = 'high'; // Android only supports 'high' or 'normal'
      }
      
      if (payload.android) {
        payload.android.priority = priority;
      } else {
        payload.android = { priority };
      }

      // 3. Chunk tokens into arrays of 500 (FCM limit)
      const chunkSize = 500;
      const chunks = [];
      for (let i = 0; i < tokens.length; i += chunkSize) {
        chunks.push(tokens.slice(i, i + chunkSize));
      }

      // 4. Send chunks concurrently without blocking the main event loop
      const sendPromises = chunks.map(async (chunk) => {
        try {
          const message: admin.messaging.MulticastMessage = {
            tokens: chunk,
            notification: payload.notification,
            data: payload.data,
            android: payload.android,
            apns: payload.apns,
            webpush: payload.webpush,
          };
          const response = await adminMessaging.sendEachForMulticast(message);
          
          // Cleanup invalid tokens async
          const failedTokens: string[] = [];
          response.responses.forEach((r, idx) => {
            if (r.error && (
              r.error.code === 'messaging/invalid-registration-token' ||
              r.error.code === 'messaging/registration-token-not-registered'
            )) {
              failedTokens.push(chunk[idx]);
            }
          });

          if (failedTokens.length > 0) {
            await pgPool.query(
              `UPDATE fcm_tokens SET is_active = FALSE WHERE token = ANY($1)`,
              [failedTokens]
            ).catch(() => {});
          }
          
          return {
            successCount: response.successCount,
            failureCount: response.failureCount,
            failedTokens: failedTokens.length,
            responses: response.responses
          };
        } catch (error: any) {
          console.error('[DirectPush] Chunk failed:', error);
          return { error: error.message };
        }
      });

      await Promise.all(sendPromises);

      // 5. Bulk insert to inbox history in chunks of 500
      const inboxChunks = [];
      for (let i = 0; i < firebaseUserIds.length; i += chunkSize) {
        inboxChunks.push(firebaseUserIds.slice(i, i + chunkSize));
      }

      for (const inboxChunk of inboxChunks) {
        const values = [];
        let paramsCount = 1;
        const queryParams: any[] = [];

        for (const uid of inboxChunk) {
          values.push(`(${paramsCount++}, ${paramsCount++}, ${paramsCount++}, ${paramsCount++}, ${paramsCount++}, 'delivered')`);
          queryParams.push(uid, JSON.stringify(payload), options.category || 'general', options.orderId || null, options.tag || null);
        }

        if (values.length > 0) {
          await client.query(`
            INSERT INTO notification_inbox (user_id, payload, category, order_id, tag, status)
            VALUES ${values.join(',')}
          `, queryParams).catch(err => console.error('[DirectPush] Inbox insert failed:', err));
        }
      }

      // 6. Enforce 400 notification history limit dynamically
      this.cleanupHistory().catch(() => {});

      const chunkResults = await Promise.all(sendPromises);
      let totalSuccess = 0;
      let totalFailure = 0;
      let totalTokensRemoved = 0;
      let allResponses: any[] = [];
      let errors: any[] = [];

      chunkResults.forEach(res => {
        if (res && res.error) {
          errors.push(res.error);
        } else if (res) {
          totalSuccess += res.successCount || 0;
          totalFailure += res.failureCount || 0;
          totalTokensRemoved += res.failedTokens || 0;
          if (res.responses) allResponses.push(...res.responses);
        }
      });

      return {
        tokensFound: tokens.length,
        successCount: totalSuccess,
        failureCount: totalFailure,
        tokensRemoved: totalTokensRemoved,
        rawResponses: allResponses,
        errors: errors.length > 0 ? errors : undefined
      };

    } finally {
      client.release();
    }
  }

  /**
   * Ensures the notification_inbox never exceeds roughly 400 records per user
   */
  private async cleanupHistory(): Promise<void> {
    try {
      // Keep only the most recent 400 notifications per user
      await pgPool.query(`
        WITH RankedInbox AS (
          SELECT id,
                 ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY created_at DESC) as rnk
          FROM notification_inbox
        )
        DELETE FROM notification_inbox
        WHERE id IN (
          SELECT id FROM RankedInbox WHERE rnk > 400
        )
      `);
    } catch (e) {
      console.error('[DirectPush] Cleanup failed:', e);
    }
  }
}

export const directNotification = new DirectNotificationService();
