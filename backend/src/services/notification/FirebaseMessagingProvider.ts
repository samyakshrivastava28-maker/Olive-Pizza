import * as admin from 'firebase-admin';

export class FirebaseMessagingProvider {
  /**
   * Sends a push notification to an array of FCM tokens.
   */
  public async sendMulticast(
    tokens: string[],
    payload: any
  ): Promise<admin.messaging.BatchResponse> {
    if (!tokens || tokens.length === 0) {
      throw new Error('No tokens provided');
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: payload.notification,
        data: payload.data
      };
      const response = await admin.messaging().sendEachForMulticast(message);
      return response;
    } catch (error) {
      console.error('[FirebaseMessagingProvider] Error sending message:', error);
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
