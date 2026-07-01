import { Request, Response, NextFunction } from 'express';
import { adminAuth, adminDb } from '../config/firebase.js';
import { query } from '../lib/db.js';

export async function logSecurityEventServer(params: {
  action: string;
  route: string;
  uid?: string;
  email?: string;
  role?: string;
  ip?: string;
}) {
  try {
    await adminDb.collection('security_logs').add({
      ...params,
      timestamp: new Date().toISOString(),
      source: 'backend_api'
    });
  } catch (error) {
    console.error('Failed to log security event on server:', error);
  }
}

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role: string;
  };
}

export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    
    // Get user role from PostgreSQL instead of Firestore
    let role = 'customer';
    try {
      const userResult = await query('SELECT role FROM users WHERE firebase_uid = $1', [uid]);
      if (userResult.rows.length > 0 && userResult.rows[0].role) {
        role = userResult.rows[0].role;
      }
    } catch (dbErr) {
      console.warn("Could not fetch user role from PG, defaulting to customer");
    }

    req.user = {
      uid,
      email: decodedToken.email,
      role
    };
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      await logSecurityEventServer({
        action: 'api_unauthorized_no_user',
        route: req.originalUrl,
        ip: req.ip
      });
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      await logSecurityEventServer({
         action: 'api_forbidden_insufficient_permissions',
         route: req.originalUrl,
         uid: req.user.uid,
         email: req.user.email,
         role: req.user.role,
         ip: req.ip
      });
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }
    next();
  };
};

export const requireAuth = verifyToken;
