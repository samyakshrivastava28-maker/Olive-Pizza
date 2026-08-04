import express from 'express';
import { adminDb, adminAuth } from '../config/firebase.js';
import { Fast2SMSProvider } from '../services/phone-verification/Fast2SMSProvider.js';
import { TruecallerProvider } from '../services/phone-verification/TruecallerProvider.js';

const router = express.Router();
const fast2sms = new Fast2SMSProvider();
const truecaller = new TruecallerProvider();

// Authentication Middleware with fallback to body/header UID
const authenticateUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  let userUid = req.body?.userId || (req.headers['x-user-uid'] as string);

  if (token) {
    try {
      const decoded = await adminAuth.verifyIdToken(token, false);
      (req as any).user = decoded;
      return next();
    } catch (error) {
      console.warn('[PhoneVerification] Token verification fallback:', error);
    }
  }

  (req as any).user = { uid: userUid || `anon_${Date.now()}` };
  next();
};

router.use(authenticateUser);

router.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const uid = (req as any).user?.uid || req.body?.userId || 'anonymous';

    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number is required.' });
    }

    const result = await fast2sms.sendOtp(phoneNumber, uid);
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error: any) {
    console.error('[PhoneVerification] send-otp error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error while sending OTP.' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp, userId } = req.body;
    const uid = userId || (req as any).user?.uid;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ success: false, error: 'Phone number and OTP code are required.' });
    }

    const result = await fast2sms.verifyOtp(phoneNumber, otp, uid);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    if (result.success && uid && !uid.startsWith('anon_')) {
      try {
        const userRef = adminDb.collection('users').doc(uid);
        await userRef.set({
          phone: result.phone,
          phoneVerified: true,
          verificationMethod: result.provider || 'fast2sms',
          verifiedAt: Date.now(),
          phoneSetupCompleted: true
        }, { merge: true });
        
        const identityRef = adminDb.collection('customer_identities').doc(result.phone!);
        await identityRef.set({
          primaryUid: uid,
          verifiedAt: Date.now()
        }, { merge: true });
      } catch (e: any) {
        console.warn('[PhoneVerification] Firestore update warning:', e.message);
      }
    }

    return res.json(result);
  } catch (error: any) {
    console.error('[PhoneVerification] verify-otp error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error while verifying OTP.' });
  }
});

router.post('/truecaller', async (req, res) => {
  const { payload } = req.body;
  const uid = (req as any).user.uid;
  
  try {
    const result = await truecaller.verifyProfile(payload, uid);
    if (!result.success) {
      return res.status(400).json(result);
    }

    if (result.success && uid && !uid.startsWith('anon_')) {
      const userRef = adminDb.collection('users').doc(uid);
      await userRef.set({
        phone: result.phone,
        phoneVerified: true,
        verificationMethod: result.provider,
        verifiedAt: Date.now(),
        truecallerName: (result as any).name,
        truecallerCountry: (result as any).country,
        phoneSetupCompleted: true
      }, { merge: true });

      const identityRef = adminDb.collection('customer_identities').doc(result.phone!);
      await identityRef.set({
        primaryUid: uid,
        verifiedAt: Date.now()
      }, { merge: true });
    }

    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Truecaller verification failed.' });
  }
});

router.get('/status', async (_req, res) => {
  const hasKey = Boolean(process.env.FAST2SMS_API_KEY && process.env.FAST2SMS_API_KEY.length > 5);
  res.json({
    success: true,
    service: 'Fast2SMS Production OTP Service',
    configured: hasKey,
    mode: hasKey ? 'PRODUCTION' : 'DEMO'
  });
});

export default router;

