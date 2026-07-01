import { adminDb } from '../../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { messagingProvider } from './FirebaseMessagingProvider.js';
import { notificationDebugger } from './NotificationDebugger.js';

export class NotificationScheduler {
  private activeIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.resumeAlarms();
  }

  /**
   * Resumes active alarms from Firestore on backend startup.
   */
  private async resumeAlarms() {
    try {
      const snapshot = await adminDb.collection('active_alarms').get();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        this.scheduleAlarm(doc.id, data.targetUserId, data.payload, data.stage);
      });
      console.log(`[NotificationScheduler] Resumed ${snapshot.size} active alarms.`);
    } catch (error) {
      console.error('[NotificationScheduler] Error resuming alarms:', error);
    }
  }

  /**
   * Starts a persistent alarm for a specific order and user.
   */
  public async startAlarm(orderId: string, targetUserId: string, payload: any, stage: string) {
    const alarmId = `${orderId}_${stage}`;
    
    if (this.activeIntervals.has(alarmId)) {
      return; // Alarm already active
    }

    // Save to Firestore for persistence
    await adminDb.collection('active_alarms').doc(alarmId).set({
      orderId,
      targetUserId,
      payload,
      stage,
      createdAt: FieldValue.serverTimestamp()
    });

    this.scheduleAlarm(alarmId, targetUserId, payload, stage);
  }

  private scheduleAlarm(alarmId: string, targetUserId: string, payload: any, stage: string) {
    // Initial send
    this.sendToUser(targetUserId, payload, 'alarm_started');

    // Schedule repeated ring (1 minute ring, 30s pause -> roughly simplified to sending every 90 seconds)
    const interval = setInterval(() => {
      this.sendToUser(targetUserId, payload, 'alarm_repeated');
    }, 90000);

    this.activeIntervals.set(alarmId, interval);
  }

  /**
   * Stops an active alarm.
   */
  public async stopAlarm(orderId: string, stage: string) {
    const alarmId = `${orderId}_${stage}`;
    const interval = this.activeIntervals.get(alarmId);
    
    if (interval) {
      clearInterval(interval);
      this.activeIntervals.delete(alarmId);
    }

    // Remove from Firestore
    await adminDb.collection('active_alarms').doc(alarmId).delete().catch(e => {
      console.error(`[NotificationScheduler] Failed to delete active alarm ${alarmId}:`, e);
    });
  }

  /**
   * Helper to send payload to a specific user by fetching their tokens.
   */
  public async sendToUser(userId: string, payload: any, category: string = 'general') {
    let notificationId: string | undefined;
    try {
      // Log creation
      notificationId = await notificationDebugger.logCreation({
        userId,
        type: 'push',
        category,
        title: payload.notification?.title || 'Notification',
        body: payload.notification?.body || '',
      });

      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        await notificationDebugger.markFailed(notificationId, 'User not found');
        return;
      }
      
      const userData = userDoc.data();
      const tokens: string[] = userData?.fcmTokens || [];
      
      const payloadCopy = JSON.parse(JSON.stringify(payload));
      
      // Inject notificationId for tracking clicks from frontend
      if (notificationId) {
        payloadCopy.data = payloadCopy.data || {};
        payloadCopy.data.notificationId = notificationId;
      }

      if (tokens.length > 0) {
        await notificationDebugger.updateStage(notificationId, 'FCM Tokens Found', { tokensFound: tokens.length });
        await notificationDebugger.updateStage(notificationId, 'Payload Generated');
        const response = await messagingProvider.sendMulticast(tokens, payloadCopy, notificationId);
        await messagingProvider.cleanupTokens(userId, tokens, response);
      } else {
        await notificationDebugger.markFailed(notificationId, 'User has no FCM tokens');
      }
    } catch (error: any) {
      console.error(`[NotificationScheduler] Error sending to user ${userId}:`, error);
      if (notificationId) {
        await notificationDebugger.markFailed(notificationId, error.message || 'Unknown scheduler error');
      }
    }
  }
}

export const notificationScheduler = new NotificationScheduler();
