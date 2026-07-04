import { Router, Request, Response } from 'express';
import { query } from '../lib/db.js';
import { emailService } from '../lib/email.service.js';
import { verifyToken, AuthRequest } from '../middleware/auth.middleware.js';
import { adminAuth, adminDb } from '../config/firebase.js';

const router = Router();

router.use(verifyToken);

// Upsert user (Called after Firebase Auth signup/login)
router.post('/sync', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const email = req.user?.email;
    const { name } = req.body;

    if (!userId || !email) {
      res.status(400).json({ error: 'Invalid user token' });
      return;
    }

    const sql = `
      INSERT INTO users (firebase_uid, email, name, role)
      VALUES ($1, $2, $3, 'customer')
      ON CONFLICT (firebase_uid) DO UPDATE 
      SET name = COALESCE(EXCLUDED.name, users.name)
      RETURNING *;
    `;
    const result = await query(sql, [userId, email, name || '']);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("User sync error", error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

// Setup Phone
router.put('/phone', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const email = req.user?.email || '';
    const { phone } = req.body;

    if (!phone) {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }

    const sql = `
      INSERT INTO users (firebase_uid, email, name, phone, phone_setup_completed, role)
      VALUES ($2, $3, 'Customer', $1, true, 'customer')
      ON CONFLICT (firebase_uid) DO UPDATE 
      SET phone = EXCLUDED.phone, phone_setup_completed = true
      RETURNING *;
    `;
    const result = await query(sql, [phone, userId, email]);
    
    if (result.rows.length === 0) {
      throw new Error('Database insertion failed');
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Phone setup error", error);
    res.status(500).json({ error: error.message || 'Failed to save phone' });
  }
});

// Setup Location
router.put('/location', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const email = req.user?.email;
    const { addressLine, city, state, pincode, lat, lng } = req.body;

    // Ensure user exists and update location flag
    const userSql = `
      INSERT INTO users (firebase_uid, email, name, location_setup_completed, role, full_address, city, state, lat, lng)
      VALUES ($1, $2, 'Customer', true, 'customer', $3, $4, $5, $6, $7)
      ON CONFLICT (firebase_uid) DO UPDATE 
      SET location_setup_completed = true,
          full_address = EXCLUDED.full_address,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          lat = EXCLUDED.lat,
          lng = EXCLUDED.lng
      RETURNING *;
    `;
    await query(userSql, [userId, email, addressLine, city, state, lat, lng]);

    // Send Welcome Email and Notify Owner
    try {
      if (email) {
        const userResult = await query('SELECT name FROM users WHERE firebase_uid = $1', [userId]);
        const name = userResult.rows[0]?.name || 'Customer';
        
        await emailService.sendWelcomeEmail(email, name);
        await emailService.sendOwnerNotification('New User Signup', `A new user ${name} (${email}) has joined and completed their profile!`);
      }
    } catch (emailErr) {
      console.error("Failed to send welcome emails", emailErr);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Location setup error", error);
    res.status(500).json({ error: 'Failed to save location' });
  }
});

// Get User Profile
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const userResult = await query('SELECT * FROM users WHERE firebase_uid = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const u = userResult.rows[0];
    res.json({
      ...u,
      address: {
        addressLine: u.full_address,
        city: u.city,
        state: u.state,
        lat: u.lat,
        lng: u.lng
      }
    });
  } catch (error) {
    console.error("Profile fetch error", error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Revoke all sessions
router.post('/revoke-all-sessions', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // 1. Revoke Firebase Auth tokens (forces all devices to re-authenticate when current token expires)
    await adminAuth.revokeRefreshTokens(userId);

    // 2. Mark all Firestore user_sessions as inactive (forces realtime listeners to sign out instantly)
    const sessionsSnapshot = await adminDb.collection('user_sessions')
      .where('uid', '==', userId)
      .where('isActive', '==', true)
      .get();

    const batch = adminDb.batch();
    sessionsSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { isActive: false });
    });
    
    if (!sessionsSnapshot.empty) {
      await batch.commit();
    }

    res.json({ success: true, message: 'All sessions revoked' });
  } catch (error) {
    console.error("Revoke sessions error", error);
    res.status(500).json({ error: 'Failed to revoke sessions' });
  }
});

export default router;
