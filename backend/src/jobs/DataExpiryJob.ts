import cron from 'node-cron';
import { adminDb } from '../config/firebase.js';

export class DataExpiryJob {
  /**
   * Initializes the cron job to run every minute
   */
  static schedule() {
    cron.schedule('* * * * *', async () => {
      try {
        await this.processExpirations();
      } catch (e) {
        console.error('[DataExpiryJob] Error running expiry job:', e);
      }
    });
    console.log('[DataExpiryJob] Auto-expiry engine scheduled (running minutely).');
  }

  /**
   * Scans collections for expired documents and archives them
   */
  static async processExpirations() {
    const now = new Date();
    const batch = adminDb.batch();
    let updatesCount = 0;

    const collections = ['coupons', 'products', 'combos', 'offers', 'ads', 'banners', 'themes'];

    for (const collectionName of collections) {
      const snap = await adminDb.collection(collectionName)
        .where('isActive', '==', true)
        .get();

      snap.forEach(doc => {
        const data = doc.data();
        let isExpired = false;

        // Handle different timestamp formats (Firestore Timestamp or ISO string)
        const expiryField = data.expiryDate || data.endDate || data.validUntil;
        
        if (expiryField) {
          const expiryDate = expiryField.toDate ? expiryField.toDate() : new Date(expiryField);
          if (!isNaN(expiryDate.getTime()) && expiryDate < now) {
            isExpired = true;
          }
        }

        if (isExpired) {
          batch.update(doc.ref, { 
            isActive: false, 
            isArchived: true, 
            autoExpiredAt: now.toISOString() 
          });
          updatesCount++;
          console.log(`[DataExpiryJob] Expired ${collectionName}/${doc.id}`);
        }
      });
    }

    if (updatesCount > 0) {
      await batch.commit();
      console.log(`[DataExpiryJob] Processed ${updatesCount} expirations.`);
      
      // Emit a cache invalidation event so frontend and AI instantly drop these items
      await adminDb.collection('system_events').add({
        type: 'cache_invalidate',
        targets: ['menu', 'coupons', 'offers', 'ai_knowledge'],
        timestamp: now.toISOString()
      });
    }
  }
}
