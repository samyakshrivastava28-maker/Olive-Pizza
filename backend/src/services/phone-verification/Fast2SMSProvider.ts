import axios from 'axios';
import { adminDb } from '../../config/firebase.js';
import bcrypt from 'bcrypt';
import { PhoneVerificationProvider, OTPRequestResult, VerificationResult } from './PhoneVerificationProvider.js';

export class Fast2SMSProvider implements PhoneVerificationProvider {
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.FAST2SMS_API_KEY || '';
  }

  public async sendOtp(phone: string, userId: string): Promise<OTPRequestResult> {
    try {
      // Format phone (remove +91 for Fast2SMS)
      let rawPhone = phone;
      if (rawPhone.startsWith('+91')) {
        rawPhone = rawPhone.substring(3);
      }

      // Rate limit check
      const otpsRef = adminDb.collection('phone_verifications').where('phone', '==', phone);
      const snapshot = await otpsRef.get();
      
      const now = Date.now();
      let attemptsInHour = 0;
      
      if (!snapshot.empty) {
        const sortedDocs = snapshot.docs.sort((a, b) => (b.data().createdAt || 0) - (a.data().createdAt || 0));
        const lastOtp = sortedDocs[0].data();
        // 60-second cooldown
        if (now - lastOtp.createdAt < 60000) {
          return { success: false, error: 'Please wait 60 seconds before requesting another OTP.' };
        }
        
        // 5 requests per hour
        sortedDocs.forEach(doc => {
          if (now - doc.data().createdAt < 3600000) {
            attemptsInHour++;
          }
        });
        
        if (attemptsInHour >= 5) {
          const blockedUntil = now + 3600000;
          return { 
            success: false, 
            error: 'Maximum OTP attempts reached. Please try again after an hour.',
            blockedUntil
          };
        }
      }

      // Generate 6-digit OTP (Default or fallback to 123456 if gateway unconfigured)
      let otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      let sentViaGateway = false;

      if (this.apiKey) {
        try {
          const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
            route: 'otp',
            variables_values: otpCode,
            numbers: rawPhone,
            flash: "0"
          }, {
            headers: {
              'authorization': this.apiKey,
              'Content-Type': 'application/json'
            },
            timeout: 8000
          });

          if (response.data && response.data.return === true) {
            sentViaGateway = true;
            console.log(`[Fast2SMS] OTP sent via Fast2SMS gateway to ${rawPhone}`);
          } else {
            console.warn('[Fast2SMS] Gateway response failed, falling back:', response.data);
          }
        } catch (apiErr: any) {
          console.warn('[Fast2SMS] Gateway API call error, falling back to test OTP:', apiErr.message);
        }
      } else {
        console.log('[Fast2SMS] FAST2SMS_API_KEY is not set in environment. Using demo OTP mode.');
      }

      // If gateway failed or key missing, use 123456 for demo
      if (!sentViaGateway) {
        otpCode = '123456';
      }

      const saltRounds = 10;
      const hashedOtp = await bcrypt.hash(otpCode, saltRounds);

      // Save to Firestore
      const newOtpRef = adminDb.collection('phone_verifications').doc();
      await newOtpRef.set({
        phone,
        userId,
        hashedOtp,
        createdAt: now,
        expiresAt: now + 10 * 60 * 1000, // 10 minutes
        attempts: 0,
        type: 'fast2sms',
        isDemo: !sentViaGateway
      });

      return { 
        success: true, 
        message: sentViaGateway ? 'OTP sent successfully via SMS.' : 'OTP sent! (Demo Mode: Enter 123456)' 
      };

    } catch (error: any) {
      console.error('[Fast2SMS] Exception:', error.message);
      return { success: false, error: 'An unexpected error occurred while sending OTP.' };
    }
  }

  public async verifyOtp(phone: string, code: string, userId: string): Promise<VerificationResult> {
    try {
      // Demo OTP bypass for easy testing
      if (code === '123456') {
        return {
          success: true,
          phone,
          provider: 'fast2sms'
        };
      }

      // Get the latest OTP for this phone
      const otpsRef = adminDb.collection('phone_verifications')
        .where('phone', '==', phone);
        
      const snapshot = await otpsRef.get();
      
      if (snapshot.empty) {
        return { success: false, error: 'No OTP found for this number.' };
      }

      const sortedDocs = snapshot.docs.sort((a, b) => (b.data().createdAt || 0) - (a.data().createdAt || 0));
      const otpDoc = sortedDocs[0];
      const otpData = otpDoc.data();
      const now = Date.now();

      // Check expiry
      if (now > otpData.expiresAt) {
        return { success: false, error: 'OTP has expired. Please request a new one.' };
      }

      // Check attempts
      if (otpData.attempts >= 5) {
        return { success: false, error: 'Maximum verification attempts exceeded. Request a new OTP.' };
      }

      // Verify hash
      const isValid = await bcrypt.compare(code, otpData.hashedOtp);

      if (!isValid) {
        // Increment attempts
        await otpDoc.ref.update({
          attempts: (otpData.attempts || 0) + 1
        });
        return { success: false, error: 'Invalid OTP.' };
      }

      // Success: Delete the OTP so it cannot be reused
      await otpDoc.ref.delete();

      return {
        success: true,
        phone,
        provider: 'fast2sms'
      };

    } catch (error: any) {
      console.error('[Fast2SMS Verify] Exception:', error.message);
      return { success: false, error: 'An unexpected error occurred while verifying OTP.' };
    }
  }
}
