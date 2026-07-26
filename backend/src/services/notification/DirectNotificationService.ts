import * as admin from 'firebase-admin';
import { adminMessaging } from '../../config/firebase.js';
import { pgPool } from '../../config/postgres.js';
import { NotificationLogger } from './NotificationLogger.js';
import { sanitizeApnsConfig } from './NotificationEngine.js';

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
      // 1. Fetch active tokens for all targets from PostgreSQL
      const tokenRes = await client.query(
        `SELECT user_id as firebase_uid, token 
         FROM fcm_tokens 
         WHERE user_id = ANY($1) AND is_active = TRUE`,
        [firebaseUserIds]
      );

      const foundUserIds = new Set(tokenRes.rows.map(r => r.firebase_uid));
      let tokens: string[] = tokenRes.rows.map(r => r.token);

      // Fallback: Fetch missing user tokens from Firestore users collection & auto-sync to Postgres
      const missingUserIds = firebaseUserIds.filter(uid => !foundUserIds.has(uid) || tokens.length === 0);
      if (missingUserIds.length > 0) {
        const { adminDb: db } = await import('../../config/firebase.js');
        for (const missingUid of missingUserIds) {
          try {
            const userDoc = await db.collection('users').doc(missingUid).get();
            const firestoreTokens: string[] = userDoc.data()?.fcmTokens || [];
            for (const t of firestoreTokens) {
              if (t && typeof t === 'string') {
                tokens.push(t);
                await client.query(
                  `INSERT INTO fcm_tokens (user_id, token, is_active, last_used_at)
                   VALUES ($1, $2, TRUE, NOW())
                   ON CONFLICT (user_id, token)
                   DO UPDATE SET is_active = TRUE, last_used_at = NOW()`,
                  [missingUid, t]
                ).catch(() => {});
              }
            }
          } catch (e: any) {
            console.warn(`[DirectPush] Firestore token fetch failed for ${missingUid}:`, e.message);
          }
        }
      }

      // Deduplicate token array
      tokens = Array.from(new Set(tokens));
      
      // 2. Ensure Android payload triggers immediately. FCM only supports 'normal' or 'high'.
      let priority = priorityOverride || options.priority || 'high';
      if (priority === 'critical' || priority === 'silent') {
        priority = 'high';
      }

      // Preserve existing Android channel if set by template; fallback to payload.data channel or default
      const channelId = payload.android?.notification?.channelId || payload.data?.channelId || 'olive_order_new';
      const soundName = payload.android?.notification?.sound || payload.data?.sound || 'default';
      const clickAction = payload.android?.notification?.clickAction || (payload.data?.alert === 'continuous' ? 'olive_alarm' : undefined);

      if (!payload.android) {
        payload.android = {};
      }
      payload.android.priority = priority;

      if (!payload.android.notification) {
        payload.android.notification = {};
      }
      payload.android.notification.channelId = channelId;
      payload.android.notification.sound = soundName;
      payload.android.notification.visibility = 'public';
      payload.android.notification.notificationPriority = priority === 'high' ? 'PRIORITY_MAX' : 'PRIORITY_DEFAULT';
      payload.android.notification.defaultVibrateTimings = payload.android.notification.defaultVibrateTimings ?? true;
      if (clickAction) {
        payload.android.notification.clickAction = clickAction;
      }

      const startTime = Date.now();
      const triggerSource = options.category === 'marketing' || payload.data?.source === 'owner_broadcast' ? 'manual' : 'automatic';
      const eventType = payload.data?.stage || payload.data?.category || options.category || 'push';

      console.log(`[DirectPush] Event Triggered: ${eventType} | Source: ${triggerSource} | Targets: ${firebaseUserIds.length} | Tokens Found: ${tokens.length}`);

      // 3. Chunk tokens into arrays of 500 (FCM limit)
      const chunkSize = 500;
      const chunks = [];
      for (let i = 0; i < tokens.length; i += chunkSize) {
        chunks.push(tokens.slice(i, i + chunkSize));
      }

      // 4. Send chunks concurrently without blocking the main event loop
      const sendPromises = chunks.map(async (chunk) => {
        try {
          const sanitizedData: Record<string, string> = {};
          if (payload.data && typeof payload.data === 'object') {
            for (const [k, v] of Object.entries(payload.data)) {
              if (v !== undefined && v !== null) {
                sanitizedData[k] = typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v);
              }
            }
          }

          // Normalize title & body into data payload so Android & Web push receivers never get blank notifications
          if (payload.notification?.title && !sanitizedData.title) {
            sanitizedData.title = String(payload.notification.title);
          }
          if (payload.notification?.body && !sanitizedData.body) {
            sanitizedData.body = String(payload.notification.body);
          }

          const sanitizedApns = sanitizeApnsConfig(payload.apns, 'direct_push');

          const message: admin.messaging.MulticastMessage = {
            tokens: chunk,
            notification: payload.notification,
            data: sanitizedData,
            android: payload.android,
            apns: sanitizedApns,
            webpush: payload.webpush,
          };
          const response = await adminMessaging.sendEachForMulticast(message);
          const elapsedTimeMs = Date.now() - startTime;
          
          // Cleanup invalid tokens async
          const failedTokens: string[] = [];
          response.responses.forEach((r, idx) => {
            const fcmToken = chunk[idx];
            
            NotificationLogger.log({
              timestamp: new Date().toISOString(),
              orderId: options.orderId,
              userId: firebaseUserIds.length === 1 ? firebaseUserIds[0] : 'bulk_target',
              triggerSource,
              eventType,
              recipientRole: payload.data?.role || options.category,
              recipientCount: firebaseUserIds.length,
              activeTokenCount: tokens.length,
              inactiveTokenCount: failedTokens.length,
              fcmToken,
              payload,
              firebaseResponse: r,
              status: r.success ? 'success' : 'failure',
              errorDetails: r.error?.message,
              elapsedTimeMs,
              retryReason: r.error ? r.error.code : undefined,
            });

            if (r.error) {
              const code = r.error.code;
              // ONLY deactivate tokens for permanent registration error codes per Fix 2
              if (
                code === 'messaging/invalid-registration-token' ||
                code === 'messaging/registration-token-not-registered' ||
                code === 'invalid-registration-token' ||
                code === 'registration-token-not-registered'
              ) {
                failedTokens.push(fcmToken);
              }
            }
          });

          if (failedTokens.length > 0) {
            await pgPool.query(
              `UPDATE fcm_tokens SET is_active = FALSE WHERE token = ANY($1)`,
              [failedTokens]
            ).catch(err => console.error('[DirectPush] Token deactivation failed:', err.message));
            console.log(`[DirectPush] Deactivated ${failedTokens.length} permanent invalid FCM tokens`);
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

        // Extract title/body/url from the payload for correct notification_inbox schema
        const inboxTitle = payload.notification?.title || payload.data?.title || 'Notification';
        const inboxBody = payload.notification?.body || payload.data?.body || '';
        const inboxUrl = payload.data?.url || '/';

        for (const uid of inboxChunk) {
          values.push(`($${paramsCount++}, $${paramsCount++}, $${paramsCount++}, $${paramsCount++}, $${paramsCount++}, $${paramsCount++}, $${paramsCount++}, $${paramsCount++})`);
          queryParams.push(
            uid,
            options.tag || null,
            options.orderId || null,
            inboxTitle,
            inboxBody,
            options.category || 'general',
            inboxUrl,
            JSON.stringify(payload.data || {})
          );
        }

        if (values.length > 0) {
          await client.query(`
            INSERT INTO notification_inbox (user_id, tag, order_id, title, body, category, url, data)
            VALUES ${values.join(',')}
            ON CONFLICT DO NOTHING
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
