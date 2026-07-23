/**
 * requireDeveloper — Developer-Only Route Guard
 *
 * Enforces three conditions:
 *   1. Valid Firebase ID token (Bearer in Authorization header)
 *   2. Email must be 'webhub2811@gmail.com'
 *   3. Firebase custom claim `developer === true`
 */
import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../config/firebase.js';
import { logSecurityEventServer } from './auth.middleware.js';

const DEVELOPER_EMAIL = 'webhub2811@gmail.com';

export interface DevRequest extends Request {
  developer?: {
    uid: string;
    email: string;
  };
}

export const requireDeveloper = async (
  req: DevRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const ip = req.ip || 'unknown';

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = await adminAuth.verifyIdToken(token);

    if (decoded.email?.toLowerCase() !== DEVELOPER_EMAIL.toLowerCase()) {
      await logSecurityEventServer({
        action: 'devops_access_denied_wrong_email',
        route: req.originalUrl,
        uid: decoded.uid,
        email: decoded.email,
        ip,
      });
      res.status(403).json({ error: 'Forbidden: Developer access only' });
      return;
    }

    if (decoded.developer !== true) {
      await logSecurityEventServer({
        action: 'devops_access_denied_missing_claim',
        route: req.originalUrl,
        uid: decoded.uid,
        email: decoded.email,
        ip,
      });
      res.status(403).json({
        error: 'Forbidden: Missing developer custom claim. Set custom claims { developer: true } for webhub2811@gmail.com',
      });
      return;
    }

    req.developer = { uid: decoded.uid, email: decoded.email! };
    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};
