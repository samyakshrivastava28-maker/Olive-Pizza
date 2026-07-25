/**
 * NotificationEngine — Single Notification Pipeline
 *
 * This is the ONE and ONLY notification sender in the entire codebase.
 * Every notification of every kind (order alarms, status updates, delivery
 * assignments, manual broadcasts, marketing) passes through this module.
 *
 * Architecture:
 *   Trigger (route handler / UI action)
 *         ↓
 *   NotificationEngine.send()
 *         ↓
 *   Recipient Resolver (Postgres fcm_tokens → Firestore fallback)
 *         ↓
 *   Payload Builder (always hybrid: notification + data blocks)
 *         ↓
 *   Firebase Admin sendEachForMulticast()
 *         ↓
 *   NotificationLogger + token deactivation + Postgres inbox
 *
 * Root cause fix for killed-app notification failure:
 *   ALL payloads now include a top-level `notification: { title, body }` block.
 *   This guarantees FCM system-tray auto-display even when the app process is
 *   dead. OliveMessagingService.onMessageReceived() still enhances delivery
 *   when the process is alive (alarm sound, action buttons, AlarmActivity).
 */

import * as admin from 'firebase-admin';
import { adminMessaging, adminDb as db } from '../../config/firebase.js';
import { pgPool } from '../../config/postgres.js';
import { NotificationLogger } from './NotificationLogger.js';
import type { NotificationPayload } from './NotificationTemplates.js';

export type NotificationCategory =
  | 'alarm_actionable'    // Continuous alarm (new order, delivery assignment) — highest priority
  | 'pinned_live'         // Ongoing pinned tracker (customer order tracker updates)
  | 'simple_informational'; // One-shot informational (marketing, standard push)

export interface NotificationEngineOptions {
  tag?: string;
  orderId?: string;
  category?: NotificationCategory | string;
  priority?: 'normal' | 'high' | 'critical';
  version?: number;
  expiresInSeconds?: number;
  /** For pinned_live: collapse notifications with same tag on device */
  collapseKey?: string;
}

export interface SendResult {
  successCount: number;
  failureCount: number;
  tokensFound: number;
  errors: string[];
}

export class NotificationEngine {
  /**
   * Send a notification to a single user.
   * Resolves their active FCM tokens from Postgres (with Firestore fallback).
   * Always sends hybrid messages (notification + data blocks).
   */
  public async send(
    firebaseUserId: string,
    payload: NotificationPayload,
    options: NotificationEngineOptions = {}
  ): Promise<SendResult> {
    return this.sendBulk([firebaseUserId], payload, options);
  }

  /**
   * Send a notification to multiple users simultaneously.
   * Resolves all active FCM tokens for the given UIDs, deduplicates,
   * chunks into FCM-safe batches of 500, and sends concurrently.
   */
  public async sendBulk(
    firebaseUserIds: string[],
    payload: NotificationPayload,
    options: NotificationEngineOptions = {}
  ): Promise<SendResult> {
    if (!firebaseUserIds || firebaseUserIds.length === 0) {
      return { successCount: 0, failureCount: 0, tokensFound: 0, errors: [] };
    }

    // ── 1. Resolve FCM tokens ─────────────────────────────────────────────────
    const tokens = await this.resolveTokens(firebaseUserIds);

    if (tokens.length === 0) {
      console.warn(`[NotificationEngine] No active FCM tokens found for UIDs: ${firebaseUserIds.join(', ')}`);
      return { successCount: 0, failureCount: 0, tokensFound: 0, errors: ['no_tokens'] };
    }

    // ── 2. Normalize Android priority ────────────────────────────────────────
    let androidPriority: 'normal' | 'high' = 'high';
    if (options.priority === 'normal') androidPriority = 'normal';

    // Preserve or set channel from payload
    const channelId = payload.android?.notification?.channelId
      || payload.data?.channelId
      || 'olive_order_new';
    const soundName = payload.android?.notification?.sound
      || payload.data?.sound
      || 'default';
    const clickAction = payload.android?.notification?.clickAction
      || (payload.data?.alert === 'continuous' ? 'olive_alarm' : undefined);

    // Ensure android block is always fully populated
    if (!payload.android) payload.android = {} as any;
    payload.android!.priority = androidPriority;
    if (!payload.android!.notification) payload.android!.notification = {} as any;
    payload.android!.notification!.channelId = channelId;
    payload.android!.notification!.sound = soundName;
    payload.android!.notification!.visibility = 'public';
    payload.android!.notification!.notificationPriority =
      androidPriority === 'high' ? 'PRIORITY_MAX' : 'PRIORITY_DEFAULT';
    payload.android!.notification!.defaultVibrateTimings =
      payload.android!.notification!.defaultVibrateTimings ?? true;
    if (clickAction) {
      payload.android!.notification!.clickAction = clickAction;
    }

    // ── 3. Sanitize data block (all values must be strings) ──────────────────
    const sanitizedData: Record<string, string> = {};
    if (payload.data && typeof payload.data === 'object') {
      for (const [k, v] of Object.entries(payload.data)) {
        if (v !== undefined && v !== null) {
          sanitizedData[k] = typeof v === 'string' ? v
            : typeof v === 'object' ? JSON.stringify(v)
            : String(v);
        }
      }
    }

    // ── 4. Chunk and send ────────────────────────────────────────────────────
    const chunkSize = 500;
    const chunks: string[][] = [];
    for (let i = 0; i < tokens.length; i += chunkSize) {
      chunks.push(tokens.slice(i, i + chunkSize));
    }

    const startTime = Date.now();
    const eventType = payload.data?.stage || payload.data?.category || options.category || 'push';
    const triggerSource = options.category === 'simple_informational' || payload.data?.source === 'owner_broadcast'
      ? 'manual' : 'automatic';

    console.log(
      `[NotificationEngine] Sending category=${options.category || 'order'} | ` +
      `targets=${firebaseUserIds.length} | tokens=${tokens.length} | chunks=${chunks.length}`
    );

    let totalSuccess = 0;
    let totalFailure = 0;
    const errors: string[] = [];
    const failedTokens: string[] = [];

    await Promise.all(chunks.map(async (chunk) => {
      try {
        const message: admin.messaging.MulticastMessage = {
          tokens: chunk,
          notification: payload.notification,
          data: sanitizedData,
          android: payload.android,
          apns: payload.apns,
          webpush: payload.webpush,
        };

        const response = await adminMessaging.sendEachForMulticast(message);
        const elapsedMs = Date.now() - startTime;
        totalSuccess += response.successCount;
        totalFailure += response.failureCount;

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
            inactiveTokenCount: 0,
            fcmToken,
            payload,
            firebaseResponse: r,
            status: r.success ? 'success' : 'failure',
            errorDetails: r.error?.message,
            elapsedTimeMs: elapsedMs,
            retryReason: r.error?.code,
          });

          if (r.error) {
            const code = r.error.code;
            // Only permanently deactivate tokens for registration errors, not transient failures
            if (
              code === 'messaging/invalid-registration-token' ||
              code === 'messaging/registration-token-not-registered' ||
              code === 'invalid-registration-token' ||
              code === 'registration-token-not-registered'
            ) {
              failedTokens.push(fcmToken);
            } else {
              errors.push(`${code}: ${r.error.message}`);
            }
          }
        });
      } catch (err: any) {
        console.error('[NotificationEngine] Chunk send failed:', err.message);
        errors.push(err.message);
        totalFailure += chunk.length;
      }
    }));

    // ── 5. Deactivate permanently invalid tokens ─────────────────────────────
    if (failedTokens.length > 0) {
      pgPool.query(
        `UPDATE fcm_tokens SET is_active = FALSE WHERE token = ANY($1)`,
        [failedTokens]
      ).catch(err => console.error('[NotificationEngine] Token deactivation failed:', err.message));
      console.log(`[NotificationEngine] Deactivated ${failedTokens.length} invalid FCM tokens`);
    }

    console.log(
      `[NotificationEngine] Result: ${totalSuccess} sent, ${totalFailure} failed, ` +
      `${tokens.length} tokens, ${Date.now() - startTime}ms`
    );

    return {
      successCount: totalSuccess,
      failureCount: totalFailure,
      tokensFound: tokens.length,
      errors,
    };
  }

  /**
   * Resolve active FCM tokens for a list of Firebase UIDs.
   * Primary: Postgres fcm_tokens (is_active=TRUE)
   * Fallback: Firestore users.fcmTokens[] (auto-synced back to Postgres)
   */
  private async resolveTokens(firebaseUserIds: string[]): Promise<string[]> {
    const client = await pgPool.connect();
    try {
      const result = await client.query(
        `SELECT user_id as firebase_uid, token
         FROM fcm_tokens
         WHERE user_id = ANY($1) AND is_active = TRUE`,
        [firebaseUserIds]
      );

      const foundUids = new Set(result.rows.map((r: any) => r.firebase_uid));
      let tokens: string[] = result.rows.map((r: any) => r.token);

      // Firestore fallback for UIDs with no Postgres tokens
      const missingUids = firebaseUserIds.filter(uid => !foundUids.has(uid));
      if (missingUids.length > 0) {
        for (const uid of missingUids) {
          try {
            const userDoc = await db.collection('users').doc(uid).get();
            const firestoreTokens: string[] = userDoc.data()?.fcmTokens || [];
            for (const t of firestoreTokens) {
              if (t && typeof t === 'string') {
                tokens.push(t);
                // Auto-sync to Postgres so future sends don't need the fallback
                client.query(
                  `INSERT INTO fcm_tokens (user_id, token, is_active, last_used_at)
                   VALUES ($1, $2, TRUE, NOW())
                   ON CONFLICT (user_id, token)
                   DO UPDATE SET is_active = TRUE, last_used_at = NOW()`,
                  [uid, t]
                ).catch(() => {});
              }
            }
          } catch (e: any) {
            console.warn(`[NotificationEngine] Firestore token fallback failed for ${uid}:`, e.message);
          }
        }
      }

      return Array.from(new Set(tokens)); // deduplicate
    } finally {
      client.release();
    }
  }

  /**
   * Resolve all active FCM tokens for users with a given role.
   * Used for bulk owner/delivery notifications.
   */
  public async resolveByRole(role: 'owner' | 'delivery_partner' | 'customer'): Promise<string[]> {
    const pgRole = role === 'delivery_partner' ? ['delivery', 'delivery_partner'] : [role];
    const client = await pgPool.connect();
    try {
      const result = await client.query(
        `SELECT DISTINCT user_id FROM fcm_tokens WHERE role = ANY($1) AND is_active = TRUE`,
        [pgRole]
      );
      let uids: string[] = result.rows.map((r: any) => r.user_id);

      // Always also union from Firestore users collection to catch any gaps
      const fsRole = role === 'delivery_partner' ? 'delivery_partner' : role;
      try {
        const fsSnap = await db.collection('users').where('role', '==', fsRole).get();
        const fsUids = fsSnap.docs.map((d: any) => d.id);
        uids = Array.from(new Set([...uids, ...fsUids]));
      } catch (e: any) {
        console.warn(`[NotificationEngine] Firestore role lookup failed for ${role}:`, e.message);
      }

      return uids;
    } finally {
      client.release();
    }
  }
}

// Singleton export
export const notificationEngine = new NotificationEngine();
