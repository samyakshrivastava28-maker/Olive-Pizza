/**
 * Enterprise Notification Queue Service
 *
 * Responsibilities:
 * 1. Enqueue notifications with dedup (tag-based live cards)
 * 2. Fetch FCM tokens from Postgres (with invalid token cleanup)
 * 3. Send via Firebase Messaging with retry/backoff
 * 4. Write to notification_inbox so nothing is lost (offline recovery)
 * 5. Track analytics per category and role
 * 6. Auto-cleanup expired and processed queue items
 */

import { OwnerTemplates, CustomerTemplates, DeliveryTemplates, MarketingTemplates } from './NotificationTemplates.js';
import { adminDb as db, adminAuth } from '../../config/firebase.js';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { notificationDebugger } from './NotificationDebugger.js';
import { pgPool } from '../../config/postgres.js';
import { adminDb, adminMessaging } from '../../config/firebase.js';

export interface EnqueueOptions {
  tag?: string;               // FCM tag for live card (maps to orderId for orders)
  orderId?: string;
  notificationId?: string;
  version?: number;
  category?: string;          // 'order' | 'delivery' | 'marketing' | 'coupon' | 'announcement' | 'alert' | 'reward' | 'system'
  priority?: 'critical' | 'high' | 'normal';
  role?: 'customer' | 'owner' | 'delivery';
  groupKey?: string;
  expiresInSeconds?: number;  // TTL for marketing/announcement
}

export class NotificationQueueService {
  private isProcessing = false;
  private processingTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Start the queue processor loop (every 2 seconds)
    this.startProcessingLoop();
    // Start periodic cleanup (every 15 minutes)
    setInterval(() => this.runCleanup(), 15 * 60 * 1000);
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Enqueue a notification. Returns the queue row ID.
   * If a tag already exists in the queue (same live card), updates it in-place.
   */
  public async enqueue(
    firebaseUserId: string,
    payload: any,
    priorityOverride?: 'normal' | 'high' | 'silent',
    options: EnqueueOptions = {}
  ): Promise<string> {
    const client = await pgPool.connect();
    try {
      // Resolve PostgreSQL UUID from Firebase UID
      let targetUserId = firebaseUserId;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firebaseUserId)) {
        const userRes = await client.query('SELECT id FROM users WHERE firebase_uid = $1', [firebaseUserId]);
        if (userRes.rows.length === 0) {
          console.warn(`[NotifQueue] User not found in Postgres for firebase_uid ${firebaseUserId}`);
          return 'user_not_found';
        }
        targetUserId = userRes.rows[0].id;
      }

      const priority = priorityOverride || (options.priority === 'critical' ? 'high' : options.priority || 'normal');
      const tag = options.tag || payload.data?.tag || null;
      const orderId = options.orderId || payload.data?.orderId || null;
      const category = options.category || payload.data?.category || 'general';
      const version = options.version || parseInt(payload.data?.version || '1');
      const expiresAt = options.expiresInSeconds
        ? new Date(Date.now() + options.expiresInSeconds * 1000)
        : null;

      // ── Resolve PostgreSQL UUID from Firebase UID ───────────────────────
      let pgUserId = targetUserId;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUserId)) {
        const userRes = await client.query('SELECT id FROM users WHERE firebase_uid = $1', [targetUserId]);
        if (userRes.rows.length > 0) {
          pgUserId = userRes.rows[0].id;
        } else {
          console.warn(`[NotifQueue] User not found in postgres for firebase UID: ${targetUserId}`);
          return 'user_not_found';
        }
      }

      // ── Check DND preferences first ─────────────────────────────────────
      if (await this.shouldSuppressByDND(pgUserId, category, priority)) {
        console.log(`[NotifQueue] Suppressed by DND for user ${pgUserId} category=${category}`);
        // Still write to inbox so user can see it when they check
        await this.writeToInbox(client, pgUserId, payload, tag, orderId, category, options, expiresAt);
        return 'dnd_suppressed';
      }

      let queueId: string;

      // ── Live Card dedup: if a queued/sending entry with same tag exists, update it ──
      if (tag) {
        const existing = await client.query(
          `SELECT id FROM notification_queue
           WHERE target_user_id = $1 AND tag = $2
             AND status IN ('queued', 'sending')
           LIMIT 1`,
          [pgUserId, tag]
        );

        if (existing.rows.length > 0) {
          // Update the existing queued notification (live card update)
          const updateResult = await client.query(
            `UPDATE notification_queue
             SET payload = $1, version = $2, priority = $3, updated_at = NOW(), status = 'queued'
             WHERE id = $4
             RETURNING id`,
            [JSON.stringify(payload), version, priority, existing.rows[0].id]
          );
          queueId = updateResult.rows[0].id;
          console.log(`[NotifQueue] Updated existing live card id=${queueId} tag=${tag} v${version}`);
        } else {
          const result = await client.query(
            `INSERT INTO notification_queue
               (target_user_id, payload, priority, status, tag, order_id, notification_id, version, category, expires_at)
             VALUES ($1, $2, $3, 'queued', $4, NULL, $5, $6, $7, $8)
             RETURNING id`,
            [pgUserId, JSON.stringify(payload), priority, tag, options.notificationId, version, category, expiresAt]
          );
          queueId = result.rows[0].id;
        }
      } else {
        const result = await client.query(
          `INSERT INTO notification_queue
             (target_user_id, payload, priority, status, order_id, notification_id, version, category, expires_at)
           VALUES ($1, $2, $3, 'queued', NULL, $4, $5, $6, $7)
           RETURNING id`,
          [pgUserId, JSON.stringify(payload), priority, options.notificationId, version, category, expiresAt]
        );
        queueId = result.rows[0].id;
      }

      // ── Write to notification_inbox (never lose a notification) ─────────
      await this.writeToInbox(client, pgUserId, payload, tag, orderId, category, options, expiresAt);

      await notificationDebugger.logCreation({
        userId: pgUserId,
        type: 'push',
        category: category || 'marketing',
        title: typeof payload === 'string' ? JSON.parse(payload).notification?.title : payload.notification?.title,
        body: typeof payload === 'string' ? JSON.parse(payload).notification?.body : payload.notification?.body,
        queueId: queueId,
        tokensFound: 0
      }, queueId).then(debugId => {
        return notificationDebugger.updateStage(debugId, 'Queued', { queueId });
      }).catch(err => console.error('[NotifQueue] Failed to log creation to debugger', err));

      return queueId;
    } finally {
      client.release();
    }
  }

  /**
   * Register or refresh a device FCM token.
   * Prevents duplicates and keeps an audit trail.
   */
  public async registerToken(
    firebaseUserId: string,
    token: string,
    deviceInfo: { deviceName?: string; platform?: string; browser?: string; appVersion?: string }
  ): Promise<void> {
    const client = await pgPool.connect();
    try {
      // Resolve PostgreSQL UUID from Firebase UID
      let pgUserId = firebaseUserId;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firebaseUserId)) {
        const userRes = await client.query('SELECT id FROM users WHERE firebase_uid = $1', [firebaseUserId]);
        if (userRes.rows.length > 0) {
          pgUserId = userRes.rows[0].id;
        } else {
          console.warn(`[NotifQueue] Could not find Postgres user for firebase_uid ${firebaseUserId}`);
          return;
        }
      }

      await client.query(
        `INSERT INTO fcm_tokens (user_id, token, device_name, platform, browser, app_version, is_active, last_used_at)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
         ON CONFLICT (user_id, token)
         DO UPDATE SET is_active = TRUE, last_used_at = NOW(),
           device_name = EXCLUDED.device_name,
           platform = EXCLUDED.platform,
           browser = EXCLUDED.browser,
           app_version = EXCLUDED.app_version`,
        [pgUserId, token, deviceInfo.deviceName, deviceInfo.platform, deviceInfo.browser, deviceInfo.appVersion]
      );
      // Also keep Firestore in sync for legacy reads
      await adminDb.collection('users').doc(firebaseUserId).update({
        fcmTokens: FieldValue.arrayUnion(token),
        notificationReady: true,
        lastTokenRefresh: FieldValue.serverTimestamp(),
      });
    } finally {
      client.release();
    }
  }

  // ─── Queue Processor ─────────────────────────────────────────────────────────

  private startProcessingLoop() {
    const tick = async () => {
      try {
        await this.processQueue();
      } catch (err) {
        console.error('[NotifQueue] Processor error:', err);
      } finally {
        // Self-scheduling — 2s if items exist, 5s if idle
        this.processingTimer = setTimeout(tick, 5000);
      }
    };
    this.processingTimer = setTimeout(tick, 2000);
  }

  public async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    const client = await pgPool.connect();

    try {
      // Grab up to 20 high-priority items first, then normal
      const result = await client.query(
        `SELECT q.*, u.firebase_uid 
         FROM notification_queue q
         JOIN users u ON q.target_user_id = u.id
         WHERE q.status = 'queued'
           AND (q.expires_at IS NULL OR q.expires_at > NOW())
         ORDER BY
           CASE q.priority WHEN 'high' THEN 1 ELSE 2 END,
           q.created_at ASC
         LIMIT 20
         FOR UPDATE OF q SKIP LOCKED`
      );

      if (result.rows.length === 0) return;

      for (const row of result.rows) {
        await this.processItem(row, client);
      }
    } finally {
      this.isProcessing = false;
      client.release();
    }
  }

  private async processItem(item: any, client: any): Promise<void> {
    const { id, target_user_id, payload, retry_count, priority, tag, order_id, version, category } = item;
    const startTime = Date.now();

    try {
      await client.query(`UPDATE notification_queue SET status = 'sending', updated_at = NOW() WHERE id = $1`, [id]);

      // ── Fetch active tokens from Postgres ─────────────────────────────────
      const tokenResult = await client.query(
        `SELECT token FROM fcm_tokens WHERE user_id = $1 AND is_active = TRUE ORDER BY last_used_at DESC LIMIT 10`,
        [target_user_id]
      );

      // Fallback to Firestore if Postgres tokens empty
      let tokens: string[] = tokenResult.rows.map((r: any) => r.token);
      if (tokens.length === 0) {
        const userDoc = await adminDb.collection('users').doc(item.firebase_uid).get();
        tokens = userDoc.data()?.fcmTokens || [];
        // Sync them into Postgres
        for (const t of tokens) {
          await client.query(
            `INSERT INTO fcm_tokens (user_id, token, is_active) VALUES ($1, $2, TRUE)
             ON CONFLICT (user_id, token) DO UPDATE SET is_active = TRUE`,
            [target_user_id, t]
          ).catch(() => {});
        }
      }

      if (tokens.length === 0) {
        throw new Error('No active FCM tokens for user');
      }

      // ── Build FCM message ─────────────────────────────────────────────────
      const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;

      // Inject queue ID for acknowledgement tracking
      parsedPayload.data = parsedPayload.data || {};
      parsedPayload.data.queueId = id;
      parsedPayload.data.version = String(version || 1);
      if (tag) parsedPayload.data.tag = tag;
      if (order_id) parsedPayload.data.orderId = order_id;

      // Remove notification object for silent/data-only pushes
      if (priority === 'silent') {
        delete parsedPayload.notification;
      }

      // ── Send via FCM Multicast ────────────────────────────────────────────
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: parsedPayload.notification,
        data: parsedPayload.data,
        android: parsedPayload.android,
        apns: parsedPayload.apns,
        webpush: parsedPayload.webpush,
      };

      const response = await adminMessaging.sendEachForMulticast(message);
      const deliveryMs = Date.now() - startTime;

      // ── Handle invalid tokens ─────────────────────────────────────────────
      const failedTokens: string[] = [];
      response.responses.forEach((r, idx) => {
        if (r.error) {
          console.error(`[FCM Error] Token idx ${idx}:`, r.error);
          const code = r.error.code;
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-argument'
          ) {
            failedTokens.push(tokens[idx]);
          }
        }
      });

      if (failedTokens.length > 0) {
        // Soft-deactivate invalid tokens (don't delete — keep for audit)
        await client.query(
          `UPDATE fcm_tokens SET is_active = FALSE WHERE user_id = $1 AND token = ANY($2)`,
          [target_user_id, failedTokens]
        );
        await adminDb.collection('users').doc(item.firebase_uid).update({
          fcmTokens: FieldValue.arrayRemove(...failedTokens),
        });
        console.log(`[NotifQueue] Deactivated ${failedTokens.length} invalid tokens for ${target_user_id}`);
      }

      const successCount = response.successCount;
      if (successCount === 0 && tokens.length > 0) {
        throw new Error('All tokens failed to receive the message');
      }

      // ── Mark as sent ──────────────────────────────────────────────────────
      await client.query(
        `UPDATE notification_queue SET status = 'sent', updated_at = NOW() WHERE id = $1`,
        [id]
      );

      // ── Track analytics ───────────────────────────────────────────────────
      await this.recordAnalytic(client, category || 'general', 'sent', 1);
      await this.recordAnalytic(client, category || 'general', 'delivered', successCount);
      await this.recordDeliveryTime(client, category || 'general', deliveryMs);

      // Update debugger
      notificationDebugger.updateStage(id, 'Firebase Response', { 
        tokensFound: tokens.length,
        status: successCount > 0 ? 'sent' : 'failed' 
      }).catch(() => {});

      console.log(`[NotifQueue] ✅ Sent id=${id} tag=${tag || 'none'} to ${successCount}/${tokens.length} devices in ${deliveryMs}ms`);
    } catch (error: any) {
      const newRetryCount = (retry_count || 0) + 1;

      if (newRetryCount >= 3) {
        // Give up — mark failed in queue and inbox
        await client.query(
          `INSERT INTO notification_history (target_user_id, title, body, category, status)
           SELECT target_user_id, payload->'notification'->>'title', payload->'notification'->>'body', category, 'failed'
           FROM notification_queue WHERE id = $1
           ON CONFLICT DO NOTHING`,
          [id]
        ).catch(() => {});
        await client.query(`DELETE FROM notification_queue WHERE id = $1`, [id]);
        await this.recordAnalytic(client, category || 'general', 'failed', 1);
        
        notificationDebugger.updateStage(id, 'Failed', { 
          error: error.message,
          status: 'failed'
        }).catch(() => {});
        
        console.error(`[NotifQueue] ❌ Permanently failed id=${id}: ${error.message}`);
      } else {
        // Exponential backoff retry
        const backoffMs = 1000 * Math.pow(2, newRetryCount);
        await client.query(
          `UPDATE notification_queue
           SET status = 'queued', retry_count = $1, updated_at = NOW(),
               scheduled_at = NOW() + ($2 || ' milliseconds')::INTERVAL
           WHERE id = $3`,
          [newRetryCount, backoffMs, id]
        );
        console.warn(`[NotifQueue] Retry #${newRetryCount} for id=${id} in ${backoffMs}ms: ${error.message}`);
      }
    }
  }

  // ─── Inbox Writer ────────────────────────────────────────────────────────────

  private async writeToInbox(
    client: any,
    userId: string,
    payload: any,
    tag: string | null,
    orderId: string | null,
    category: string,
    options: EnqueueOptions,
    expiresAt: Date | null
  ): Promise<void> {
    try {
      const p = typeof payload === 'string' ? JSON.parse(payload) : payload;
      const title = p.notification?.title || 'Notification';
      const body = p.notification?.body || '';

      if (tag) {
        // Upsert: update existing inbox item with same tag (live card)
        await client.query(
          `INSERT INTO notification_inbox (user_id, tag, order_id, title, body, category, url, data, version, expires_at, is_read, updated_at)
           VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, FALSE, NOW())
           ON CONFLICT (user_id, tag) WHERE tag IS NOT NULL
           DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, version = EXCLUDED.version,
             data = EXCLUDED.data, expires_at = EXCLUDED.expires_at, is_read = FALSE, updated_at = NOW()`,
          [userId, tag, title, body, category, p.data?.url || '/', JSON.stringify(p.data), options.version || 1, expiresAt]
        ).catch(() => {
          // Fallback: plain insert if constraint doesn't exist yet
          client.query(
            `INSERT INTO notification_inbox (user_id, tag, order_id, title, body, category, url, data, version, expires_at)
             VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT DO NOTHING`,
            [userId, tag, title, body, category, p.data?.url || '/', JSON.stringify(p.data), options.version || 1, expiresAt]
          ).catch(() => {});
        });
      } else {
        await client.query(
          `INSERT INTO notification_inbox (user_id, order_id, title, body, category, url, data, version, expires_at)
           VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8)`,
          [userId, title, body, category, p.data?.url || '/', JSON.stringify(p.data), options.version || 1, expiresAt]
        ).catch(() => {});
      }
    } catch (err) {
      // Never block main flow for inbox write failures
      console.error('[NotifQueue] Inbox write failed (non-blocking):', err);
    }
  }

  // ─── Analytics ───────────────────────────────────────────────────────────────

  private async recordAnalytic(client: any, category: string, field: 'sent' | 'delivered' | 'opened' | 'failed', count: number): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const col = `${field}_count`;
    await client.query(
      `INSERT INTO notification_analytics (period_date, category, ${col})
       VALUES ($1, $2, $3)
       ON CONFLICT (period_date, category, role)
       DO UPDATE SET ${col} = notification_analytics.${col} + EXCLUDED.${col}, updated_at = NOW()`,
      [today, category, count]
    ).catch(() => {});
  }

  private async recordDeliveryTime(client: any, category: string, ms: number): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    await client.query(
      `INSERT INTO notification_analytics (period_date, category, total_delivery_time_ms, delivered_count)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (period_date, category, role)
       DO UPDATE SET total_delivery_time_ms = notification_analytics.total_delivery_time_ms + $3,
         updated_at = NOW()`,
      [today, category, ms]
    ).catch(() => {});
  }

  // ─── DND Check ───────────────────────────────────────────────────────────────

  private async shouldSuppressByDND(userId: string, category: string, priority: string): Promise<boolean> {
    if (priority === 'high') return false; // High priority always breaks through
    try {
      const client = await pgPool.connect();
      try {
        const result = await client.query(
          `SELECT mute_marketing, mute_low_priority FROM notification_preferences WHERE user_id = $1`,
          [userId]
        );
        if (result.rows.length === 0) return false;
        const prefs = result.rows[0];
        if (prefs.mute_marketing && (category === 'marketing' || category === 'announcement')) return true;
        if (prefs.mute_low_priority && priority === 'normal') return true;
        return false;
      } finally {
        client.release();
      }
    } catch {
      return false;
    }
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────────

  public async runCleanup(): Promise<void> {
    const client = await pgPool.connect();
    try {
      await client.query('SELECT cleanup_notifications()');
      console.log('[NotifQueue] ✅ Auto-cleanup complete');
    } catch (err) {
      console.error('[NotifQueue] Cleanup error (non-fatal):', err);
    } finally {
      client.release();
    }
  }

  public destroy(): void {
    if (this.processingTimer) clearTimeout(this.processingTimer);
  }
}

export const notificationQueue = new NotificationQueueService();
