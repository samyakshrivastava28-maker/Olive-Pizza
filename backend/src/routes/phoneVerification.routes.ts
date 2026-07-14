import express from 'express';
import { adminDb, adminAuth } from '../config/firebase.js';
import { Fast2SMSProvider } from '../services/phone-verification/Fast2SMSProvider.js';
import { TruecallerProvider } from '../services/phone-verification/TruecallerProvider.js';

const router = express.Router();
const fast2sms = new Fast2SMSProvider();
const truecaller = new TruecallerProvider();

// Authentication Middleware
const authenticateUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Unauthorized. No token provided.' });
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Unauthorized. Invalid token.' });
  }
};

router.use(authenticateUser);

router.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  const uid = (req as any).user.uid;
  if (!phone) return res.status(400).json({ success: false, error: 'Phone number is required.' });

  const result = await fast2sms.sendOtp!(phone, uid);
  return res.json(result);
});

router.post('/verify-otp', async (req, res) => {
  const { phone, code } = req.body;
  const uid = (req as any).user.uid;
  if (!phone || !code) return res.status(400).json({ success: false, error: 'Phone and code are required.' });

  const result = await fast2sms.verifyOtp!(phone, code, uid);
  
  if (result.success) {
    // Update user document
    const userRef = adminDb.collection('users').doc(uid);
    await userRef.set({
      phone: result.phone,
      phoneVerified: true,
      verificationMethod: result.provider,
      verifiedAt: Date.now(),
      phoneSetupCompleted: true
    }, { merge: true });
    
    // Also update identity document for idempotency
    const identityRef = adminDb.collection('customer_identities').doc(result.phone!);
    await identityRef.set({
      primaryUid: uid,
      verifiedAt: Date.now()
    }, { merge: true });
  }

  return res.json(result);
});

router.post('/truecaller', async (req, res) => {
  const { payload, signature, signatureAlgorithm } = req.body;
  const uid = (req as any).user.uid;
  
  if (!payload || !signature) {
    return res.status(400).json({ success: false, error: 'Invalid Truecaller request.' });
  }

  const result = await truecaller.verifyNativePayload!(payload, signature, signatureAlgorithm);

  if (result.success) {
    // Update user document
    const userRef = adminDb.collection('users').doc(uid);
    await userRef.set({
      phone: result.phone,
      phoneVerified: true,
      verificationMethod: result.provider,
      verifiedAt: Date.now(),
      truecallerName: result.name,
      truecallerCountry: result.country,
      phoneSetupCompleted: true
    }, { merge: true });

    // Also update identity document
    const identityRef = adminDb.collection('customer_identities').doc(result.phone!);
    await identityRef.set({
      primaryUid: uid,
      verifiedAt: Date.now()
    }, { merge: true });
  }

  return res.json(result);
});

router.get('/status', async (req, res) => {
  // Can be used by diagnostics
  res.json({ success: true, message: 'Phone verification service is online.' });
});

export default router;
