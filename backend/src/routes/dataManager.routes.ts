import express from 'express';
import { storageAnalyzer } from '../services/storageAnalyzer.service.js';

const router = express.Router();

router.get('/overview', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const data = await storageAnalyzer.getOverview(force);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/firestore', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const data = await storageAnalyzer.getFirestoreUsage(force);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/supabase', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const data = await storageAnalyzer.getSupabaseUsage(force);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/cloudinary', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const data = await storageAnalyzer.getCloudinaryUsage(force);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/google-drive', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const data = await storageAnalyzer.getDriveUsage(force);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/qdrant', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const data = await storageAnalyzer.getQdrantUsage(force);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/email', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const data = await storageAnalyzer.getEmailUsage(force);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const data = await storageAnalyzer.getNotificationUsage(force);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

import { pgPool } from '../config/postgres.js';

router.get('/history', async (req, res) => {
  try {
    const provider = req.query.provider as string;
    const client = await pgPool.connect();
    
    // Fetch last 50 data points for the mini charts
    let query = 'SELECT * FROM storage_analytics ';
    let params: any[] = [];
    
    if (provider && provider !== 'all') {
      query += 'WHERE provider = $1 ';
      params.push(provider);
    }
    query += 'ORDER BY timestamp DESC LIMIT 50;';
    
    const result = await client.query(query, params);
    
    // Also fetch daily history for long term trend
    let dailyQuery = 'SELECT * FROM storage_analytics_daily ';
    if (provider && provider !== 'all') {
      dailyQuery += 'WHERE provider = $1 ';
    }
    dailyQuery += 'ORDER BY date DESC LIMIT 30;';
    const dailyResult = await client.query(dailyQuery, params);
    
    client.release();
    
    res.json({
      recent: result.rows.reverse(),
      daily: dailyResult.rows.reverse()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
