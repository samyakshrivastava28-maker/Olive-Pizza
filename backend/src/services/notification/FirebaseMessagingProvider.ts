import * as admin from 'firebase-admin';
import { notificationDebugger } from './NotificationDebugger.js';

export class FirebaseMessagingProvider {
  /**
   * Sends a push notification to an array of FCM tokens.
   */
  public async sendMulticast(
    tokens: string[],
    payload: any,
    notificationId?: string
  ): Promise<admin.messaging.BatchResponse> {
    if (!tokens || tokens.length === 0) {
      if (notificationId) {
        await notificationDebugger.markFailed(notificationId, 'No tokens provided');
      }
      throw new Error('No tokens provided');
    }

    try {
      if (notificationId) {
        await notificationDebugger.updateStage(notificationId, 'Sent to Firebase', { tokensFound: tokens.length });
      }

      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: payload.notification,
        data: payload.data
      };
      const response = await admin.messaging().sendEachForMulticast(message);
      
      if (notificationId) {
        if (response.failureCount === tokens.length) {
          await notificationDebugger.updateStage(notificationId, 'Failed', { error: 'All tokens failed' });
        } else {
          await notificationDebugger.updateStage(notificationId, 'Firebase Response');
        }
      }

      return response;
    } catch (error: any) {
      console.error('[FirebaseMessagingProvider] Error sending message:', error);
      if (notificationId) {
        await notificationDebugger.markFailed(notificationId, error.message || 'Unknown error');
      }
      throw error;
    }
  }

  /**
   * Clean up expired or unregistered tokens from Firestore based on the response.
   */
  public async cleanupTokens(
    userId: string,
    tokens: string[],
    response: admin.messaging.BatchResponse
  ): Promise<void> {
    const failedTokens: string[] = [];
    response.responses.forEach((result: admin.messaging.SendResponse, index: number) => {
      const error = result.error;
      if (error) {
        if (
          error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered'
        ) {
          failedTokens.push(tokens[index]);
        }
      }
    });

    if (failedTokens.length > 0) {
      console.log(`[FirebaseMessagingProvider] Cleaning up ${failedTokens.length} invalid tokens for user ${userId}`);
      // Remove invalid tokens from Firestore user document
      await admin.firestore().collection('users').doc(userId).update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
      });
    }
  }
}

export const messagingProvider = new FirebaseMessagingProvider();
