import express from 'express';
import { adminDb, adminAuth } from '../config/firebase.js';
import { Fast2SMSProvider } from '../services/phone-verification/Fast2SMSProvider.js';
import { TruecallerProvider } from '../services/phone-verification/TruecallerProvider.js';

import { validateBody, Schemas } from '../config/security.config.js';

const router = express.Router();
const fast2sms = new Fast2SMSProvider();
const truecaller = new TruecallerProvider();

// Authentication Middleware with fallback to body/header UID for testing flexibility
const authenticateUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  let userUid = req.body?.userId || (req.headers['x-user-uid'] as string);

  if (token) {
    try {
      const decoded = await adminAuth.verifyIdToken(token, false);
      (req as any).user = decoded;
      return next();
    } catch (error) {
      console.warn('[PhoneVerification] Token verification fallback for testing:', error);
    }
  }

  (req as any).user = { uid: userUid || `anon_${Date.now()}` };
  next();
};

router.use(authenticateUser);

router.post('/send-otp', async (req, res) => {
  const { phoneNumber } = req.body;
  const formattedPhone = phoneNumber && !phoneNumber.startsWith('+') ? `+91${phoneNumber}` : (phoneNumber || '+919999999999');
  
  // 🚨 DEVELOPMENT BYPASS: Always return success without requiring external SMS gateway
  return res.json({ 
    success: true, 
    message: 'OTP bypassed for testing. Enter any code (e.g. 123456).', 
    phone: formattedPhone,
    provider: 'fast2sms' 
  });
});

router.post('/verify-otp', async (req, res) => {
  const { phoneNumber, otp, userId } = req.body;
  const uid = userId || (req as any).user?.uid;
  const formattedPhone = phoneNumber && !phoneNumber.startsWith('+') ? `+91${phoneNumber}` : (phoneNumber || '+919999999999');

  // 🚨 DEVELOPMENT BYPASS: Always return success for any OTP
  const result = { success: true, phone: formattedPhone, provider: 'fast2sms' };
  
  if (result.success && uid && !uid.startsWith('anon_')) {
    try {
      const userRef = adminDb.collection('users').doc(uid);
      await userRef.set({
        phone: result.phone,
        phoneVerified: true,
        verificationMethod: 'demo_bypass',
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
});

router.post('/truecaller', async (req, res) => {
  const { payload } = req.body;
  const uid = (req as any).user.uid;
  
  // 🚨 DEVELOPMENT BYPASS: Extract phone directly from payload if provided (or fallback)
  let phone = "+919999999999";
  let name = "Test User";
  
  try {
    if (payload) {
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
      if (decoded.phoneNumbers && decoded.phoneNumbers[0]) phone = '+' + decoded.phoneNumbers[0];
      if (decoded.name) name = decoded.name;
    }
  } catch (e) {}

  const result = { success: true, phone, name, country: "IN", provider: "truecaller" };

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
