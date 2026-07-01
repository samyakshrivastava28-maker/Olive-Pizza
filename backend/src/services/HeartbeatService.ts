import { pgPool } from '../config/postgres.js';

export class HeartbeatService {
  /**
   * Records a heartbeat for a user device
   */
  public async recordHeartbeat(userId: string, data: {
    deviceName?: string;
    browser?: string;
    platform?: string;
    appVersion?: string;
    notificationReady?: boolean;
    batteryLevel?: number;
    connectionQuality?: string;
  }) {
    const client = await pgPool.connect();
    try {
      const deviceName = data.deviceName || 'Unknown Device';
      
      const existing = await client.query(
        `SELECT id FROM device_heartbeats WHERE user_id = $1 AND device_name = $2`,
        [userId, deviceName]
      );
      
      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE device_heartbeats 
           SET browser = $1, platform = $2, app_version = $3, 
               is_online = true, last_seen = CURRENT_TIMESTAMP, 
               notification_ready = $4, battery_level = $5, connection_quality = $6
           WHERE id = $7`,
          [data.browser, data.platform, data.appVersion, data.notificationReady !== false, data.batteryLevel, data.connectionQuality, existing.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO device_heartbeats (user_id, device_name, browser, platform, app_version, is_online, notification_ready, battery_level, connection_quality)
           VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8)`,
          [userId, deviceName, data.browser, data.platform, data.appVersion, data.notificationReady !== false, data.batteryLevel, data.connectionQuality]
        );
      }
    } catch (error) {
      console.error('[HeartbeatService] Error recording heartbeat:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves active devices for a user
   */
  public async getActiveDevices(userId: string) {
    const client = await pgPool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM device_heartbeats WHERE user_id = $1 ORDER BY last_seen DESC`,
        [userId]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
}

export const heartbeatService = new HeartbeatService();
