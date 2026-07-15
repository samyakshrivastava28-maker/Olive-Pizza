import { pgPool } from '../config/postgres.js';
import { adminDb, adminAuth } from '../config/firebase.js'; 
import { v2 as cloudinary } from 'cloudinary';
import { google } from 'googleapis';
import { QdrantClient } from '@qdrant/js-client-rest';
import cron from 'node-cron';
import NodeCache from 'node-cache';

// Intelligent caching to prevent spamming APIs (60s default)
const cache = new NodeCache({ stdTTL: 60, checkperiod: 65 });

export class StorageAnalyzerService {
  private static instance: StorageAnalyzerService;

  private constructor() {}

  public static getInstance(): StorageAnalyzerService {
    if (!StorageAnalyzerService.instance) {
      StorageAnalyzerService.instance = new StorageAnalyzerService();
    }
    return StorageAnalyzerService.instance;
  }

  // --- Cron Jobs for Data Retention ---
  public startCronJobs() {
    // Run daily at midnight to aggregate storage_analytics into storage_analytics_daily
    cron.schedule('0 0 * * *', async () => {
      console.log('Running storage analytics daily rollup...');
      try {
        const client = await pgPool.connect();
        await client.query('BEGIN');

        // Roll up yesterday's data
        await client.query(`
          INSERT INTO storage_analytics_daily (provider, used_bytes_avg, capacity_bytes_avg, date)
          SELECT provider, AVG(used_bytes)::BIGINT, MAX(capacity_bytes)::BIGINT, CURRENT_DATE - INTERVAL '1 day'
          FROM storage_analytics
          WHERE timestamp >= CURRENT_DATE - INTERVAL '1 day' AND timestamp < CURRENT_DATE
          GROUP BY provider
          ON CONFLICT (provider, date) DO UPDATE 
          SET used_bytes_avg = EXCLUDED.used_bytes_avg,
              capacity_bytes_avg = EXCLUDED.capacity_bytes_avg;
        `);

        // Delete raw high-frequency data older than 24 hours to keep DB under 10MB
        await client.query(`
          DELETE FROM storage_analytics 
          WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '24 hours';
        `);

        // Also clean up daily analytics older than 1 year
        await client.query(`
          DELETE FROM storage_analytics_daily
          WHERE date < CURRENT_DATE - INTERVAL '1 year';
        `);

        await client.query('COMMIT');
        client.release();
        console.log('Storage analytics cleanup completed successfully.');
      } catch (err) {
        console.error('Error during storage analytics rollup:', err);
      }
    });
  }

  // Record snapshot helper
  private async recordSnapshot(provider: string, usedBytes: number, capacityBytes: number | null, health: string, latencyMs: number) {
    try {
      await pgPool.query(
        'INSERT INTO storage_analytics (provider, used_bytes, capacity_bytes, health_status, latency_ms) VALUES ($1, $2, $3, $4, $5)',
        [provider, usedBytes, capacityBytes, health, latencyMs]
      );
    } catch (err) {
      console.error(`Failed to record snapshot for ${provider}:`, err);
    }
  }

  // --- 1. Firestore Calculation ---
  public async getFirestoreUsage(forceRecalculate = false) {
    const cacheKey = 'firestore_usage';
    if (!forceRecalculate && cache.has(cacheKey)) return cache.get(cacheKey);

    const startTime = Date.now();
    let totalUsedBytes = 0;
    const collectionsDetails: any[] = [];
    
    try {
      // Analyze Firestore dynamically
      const collections = await adminDb.listCollections();
      for (const collection of collections) {
        let colSize = 0;
        let docCount = 0;
        
        const snapshot = await collection.get();
        docCount = snapshot.size;
        
        snapshot.forEach((doc: any) => {
          const dataStr = JSON.stringify(doc.data());
          colSize += Buffer.byteLength(dataStr, 'utf8') + Buffer.byteLength(doc.id, 'utf8');
        });

        totalUsedBytes += colSize;
        collectionsDetails.push({
          name: collection.id,
          sizeBytes: colSize,
          count: docCount,
          avgDocSizeBytes: docCount > 0 ? Math.floor(colSize / docCount) : 0
        });
      }

      collectionsDetails.sort((a, b) => b.sizeBytes - a.sizeBytes);

      const result = {
        totalUsedBytes,
        collections: collectionsDetails,
        largestCollection: collectionsDetails[0] || null,
        totalDocuments: collectionsDetails.reduce((sum, c) => sum + c.count, 0),
        status: 'Healthy'
      };

      cache.set(cacheKey, result);
      await this.recordSnapshot('firestore', totalUsedBytes, null, 'Healthy', Date.now() - startTime);
      return result;
    } catch (err: any) {
      console.error('Firestore storage scan failed:', err);
      const result = { totalUsedBytes: 0, status: 'Error', error: err.message };
      await this.recordSnapshot('firestore', 0, null, 'Error', Date.now() - startTime);
      return result;
    }
  }

  // --- 2. Supabase PostgreSQL ---
  public async getSupabaseUsage(forceRecalculate = false) {
    const cacheKey = 'supabase_usage';
    if (!forceRecalculate && cache.has(cacheKey)) return cache.get(cacheKey);

    const startTime = Date.now();
    try {
      const client = await pgPool.connect();
      
      const dbSizeRes = await client.query('SELECT pg_database_size(current_database()) as size;');
      const totalUsedBytes = parseInt(dbSizeRes.rows[0].size, 10);

      const tablesRes = await client.query(`
        SELECT 
          relname as table_name,
          pg_total_relation_size(relid) as total_size,
          pg_relation_size(relid) as table_size,
          pg_indexes_size(relid) as index_size,
          n_live_tup as row_count
        FROM pg_catalog.pg_stat_user_tables
        ORDER BY pg_total_relation_size(relid) DESC;
      `);

      client.release();

      const result = {
        totalUsedBytes,
        tables: tablesRes.rows.map(row => ({
          name: row.table_name,
          totalSizeBytes: parseInt(row.total_size, 10),
          tableSizeBytes: parseInt(row.table_size, 10),
          indexSizeBytes: parseInt(row.index_size, 10),
          rowCount: parseInt(row.row_count, 10)
        })),
        status: 'Healthy'
      };

      cache.set(cacheKey, result);
      await this.recordSnapshot('supabase', totalUsedBytes, null, 'Healthy', Date.now() - startTime);
      return result;
    } catch (err: any) {
      const result = { totalUsedBytes: 0, status: 'Error', error: err.message };
      await this.recordSnapshot('supabase', 0, null, 'Error', Date.now() - startTime);
      return result;
    }
  }
  // --- 3. Cloudinary ---
  public async getCloudinaryUsage(forceRecalculate = false) {
    const cacheKey = 'cloudinary_usage';
    if (!forceRecalculate && cache.has(cacheKey)) return cache.get(cacheKey);

    const startTime = Date.now();
    try {
      // Admin API: usage()
      // If Admin API is restricted or not available on free tier, fallback to fetching resources
      let totalUsedBytes = 0;
      let bandwidthBytes = 0;
      let reqCount = 0;
      let status = 'Healthy';

      try {
        const usage = await cloudinary.api.usage();
        totalUsedBytes = usage.storage?.usage || 0;
        bandwidthBytes = usage.bandwidth?.usage || 0;
        reqCount = usage.requests?.usage || 0;
      } catch (err: any) {
        // Fallback: search all assets and sum their bytes (if usage API is unavailable)
        console.warn('Cloudinary usage API restricted, falling back to resource scan...');
        let nextCursor = null;
        do {
          const cloudRes: any = await cloudinary.api.resources({ max_results: 500, next_cursor: nextCursor });
          for (const asset of cloudRes.resources) {
            totalUsedBytes += asset.bytes;
          }
          nextCursor = cloudRes.next_cursor;
        } while (nextCursor);
      }

      const result = {
        totalUsedBytes,
        bandwidthBytes,
        requestCount: reqCount,
        status
      };

      cache.set(cacheKey, result);
      await this.recordSnapshot('cloudinary', totalUsedBytes, null, status, Date.now() - startTime);
      return result;
    } catch (err: any) {
      const result = { totalUsedBytes: 0, status: 'Error', error: err.message };
      await this.recordSnapshot('cloudinary', 0, null, 'Error', Date.now() - startTime);
      return result;
    }
  }

  // --- 4. Google Drive ---
  public async getDriveUsage(forceRecalculate = false) {
    const cacheKey = 'drive_usage';
    if (!forceRecalculate && cache.has(cacheKey)) return cache.get(cacheKey);
    const startTime = Date.now();

    try {
      // Import dynamically to avoid circular dependency
      const { googleDriveService } = await import('./googleDrive.service.js');
      if (!googleDriveService.isEnabled) {
        throw new Error('Google Drive service is disabled');
      }

      // @ts-ignore - access private drive instance for advanced query
      const drive = googleDriveService.drive;
      if (!drive) throw new Error('Drive client not initialized');

      // Attempt to get quota
      let totalUsedBytes = 0;
      let limitBytes: number | null = null;
      let filesCount = 0;
      
      try {
        const about = await drive.about.get({ fields: 'storageQuota' });
        totalUsedBytes = parseInt(about.data.storageQuota?.usage || '0', 10);
        limitBytes = parseInt(about.data.storageQuota?.limit || '0', 10);
      } catch (e) {
        // Fallback if about.get fails (scope missing): scan files
        let pageToken = undefined;
        do {
          const res: any = await drive.files.list({
            fields: 'nextPageToken, files(id, size)',
            pageSize: 1000,
            pageToken
          });
          for (const f of res.data.files || []) {
            totalUsedBytes += parseInt(f.size || '0', 10);
            filesCount++;
          }
          pageToken = res.data.nextPageToken;
        } while (pageToken);
      }

      const result = { totalUsedBytes, capacityBytes: limitBytes, filesCount, status: 'Healthy' };
      cache.set(cacheKey, result);
      await this.recordSnapshot('drive', totalUsedBytes, limitBytes, 'Healthy', Date.now() - startTime);
      return result;
    } catch (err: any) {
      const result = { totalUsedBytes: 0, status: 'Offline', error: err.message };
      await this.recordSnapshot('drive', 0, null, 'Offline', Date.now() - startTime);
      return result;
    }
  }

  // --- 5. Qdrant ---
  public async getQdrantUsage(forceRecalculate = false) {
    const cacheKey = 'qdrant_usage';
    if (!forceRecalculate && cache.has(cacheKey)) return cache.get(cacheKey);
    const startTime = Date.now();

    try {
      const { qdrantService, QDRANT_COLLECTION } = await import('./ai/QdrantService.js');
      const status = await qdrantService.getStatus();
      
      let totalUsedBytes = 0;
      let vectorCount = 0;

      // Approximate storage: Qdrant doesn't expose byte size easily via REST without telemetry endpoint.
      // If telemetry fails, we estimate based on vectors (dimensions * 4 bytes + payload).
      try {
        // @ts-ignore
        const telemetry = await qdrantService.fetchQdrant('/telemetry');
        totalUsedBytes = (telemetry as any)?.result?.collections?.collections?.[0]?.segments_size || 0;
        vectorCount = (telemetry as any)?.result?.collections?.collections?.[0]?.vectors_count || 0;
      } catch (e) {
        // Fallback: estimate from collection info
        const info: any = status; 
        vectorCount = info.vectorsCount || info.vectorCount || 0;
        // ~1536 dim * 4 bytes + payload (~500 bytes) = ~6.6KB per vector roughly
        totalUsedBytes = vectorCount * 6644; 
      }

      const result = { totalUsedBytes, vectorCount, status: 'Healthy' };
      cache.set(cacheKey, result);
      await this.recordSnapshot('qdrant', totalUsedBytes, null, 'Healthy', Date.now() - startTime);
      return result;
    } catch (err: any) {
      const result = { totalUsedBytes: 0, status: 'Offline', error: err.message };
      await this.recordSnapshot('qdrant', 0, null, 'Offline', Date.now() - startTime);
      return result;
    }
  }

  // --- 6. Email System ---
  public async getEmailUsage(forceRecalculate = false) {
    const cacheKey = 'email_usage';
    if (!forceRecalculate && cache.has(cacheKey)) return cache.get(cacheKey);
    const startTime = Date.now();

    try {
      const client = await pgPool.connect();
      const res = await client.query('SELECT pg_total_relation_size(\\\'email_queue\\\') as size, (SELECT count(*) FROM email_queue WHERE status = \\\'pending\\\') as pending, (SELECT count(*) FROM email_queue WHERE status = \\\'failed\\\') as failed;');
      client.release();

      const totalUsedBytes = parseInt(res.rows[0].size, 10) || 0;
      const result = {
        totalUsedBytes,
        pending: parseInt(res.rows[0].pending, 10),
        failed: parseInt(res.rows[0].failed, 10),
        status: 'Healthy'
      };
      cache.set(cacheKey, result);
      await this.recordSnapshot('email', totalUsedBytes, null, 'Healthy', Date.now() - startTime);
      return result;
    } catch (err: any) {
      const result = { totalUsedBytes: 0, status: 'Error', error: err.message };
      await this.recordSnapshot('email', 0, null, 'Error', Date.now() - startTime);
      return result;
    }
  }

  // --- 7. Notification System ---
  public async getNotificationUsage(forceRecalculate = false) {
    const cacheKey = 'notification_usage';
    if (!forceRecalculate && cache.has(cacheKey)) return cache.get(cacheKey);
    const startTime = Date.now();

    try {
      const client = await pgPool.connect();
      // Assume a notification_history or push_queue table exists. We'll check sizes safely.
      let size = 0;
      try {
        const res = await client.query('SELECT pg_total_relation_size(\\\'notification_queue\\\') as size;');
        size = parseInt(res.rows[0].size, 10) || 0;
      } catch (e) {
        // Ignore if table missing
      }
      client.release();

      const result = { totalUsedBytes: size, status: 'Healthy' };
      cache.set(cacheKey, result);
      await this.recordSnapshot('notifications', size, null, 'Healthy', Date.now() - startTime);
      return result;
    } catch (err: any) {
      const result = { totalUsedBytes: 0, status: 'Error', error: err.message };
      await this.recordSnapshot('notifications', 0, null, 'Error', Date.now() - startTime);
      return result;
    }
  }

  // --- Global Overview ---
  public async getOverview(forceRecalculate = false) {
    const [firestore, supabase, cloudinary, drive, qdrant, email, notif] = await Promise.all([
      this.getFirestoreUsage(forceRecalculate),
      this.getSupabaseUsage(forceRecalculate),
      this.getCloudinaryUsage(forceRecalculate),
      this.getDriveUsage(forceRecalculate),
      this.getQdrantUsage(forceRecalculate),
      this.getEmailUsage(forceRecalculate),
      this.getNotificationUsage(forceRecalculate)
    ]);

    return {
      firestore,
      supabase,
      cloudinary,
      drive,
      qdrant,
      email,
      notifications: notif,
      timestamp: new Date().toISOString()
    };
  }
}

export const storageAnalyzer = StorageAnalyzerService.getInstance();
