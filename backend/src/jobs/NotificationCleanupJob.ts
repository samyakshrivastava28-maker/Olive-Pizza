import { adminDb as db } from '../../config/firebase.js';

export class NotificationCleanupJob {
  /**
   * Deletes all notification history older than yesterday start of day.
   */
  public static async run(): Promise<void> {
    console.log('[NotificationCleanupJob] Starting cleanup...');
    try {
      // Calculate start of yesterday
      const now = new Date();
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const cutoffTime = yesterday.toISOString();
      
      const batchSize = 500;
      let deletedCount = 0;
      
      const collectionRef = db.collection('notification_history');
      
      while (true) {
        const snapshot = await collectionRef
          .where('timestamp', '<', cutoffTime)
          .limit(batchSize)
          .get();
          
        if (snapshot.size === 0) {
          break;
        }
        
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        deletedCount += snapshot.size;
        console.log(`[NotificationCleanupJob] Deleted ${deletedCount} old notifications...`);
      }
      
      console.log(`[NotificationCleanupJob] Finished. Total deleted: ${deletedCount}`);
    } catch (err) {
      console.error('[NotificationCleanupJob] Failed:', err);
    }
  }
}
