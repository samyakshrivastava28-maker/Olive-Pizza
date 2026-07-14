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
      if (!this.apiKey) {
        console.error('[Fast2SMS] API key is missing');
        return { success: false, error: 'Internal SMS service configuration error.' };
      }

      // Format phone (remove +91 for Fast2SMS)
      let rawPhone = phone;
      if (rawPhone.startsWith('+91')) {
        rawPhone = rawPhone.substring(3);
      }

      // Rate limit check
      const otpsRef = adminDb.collection('phone_verifications').where('phone', '==', phone);
      const snapshot = await otpsRef.orderBy('createdAt', 'desc').limit(5).get();
      
      const now = Date.now();
      let attemptsInHour = 0;
      
      if (!snapshot.empty) {
        const lastOtp = snapshot.docs[0].data();
        // 60-second cooldown
        if (now - lastOtp.createdAt < 60000) {
          return { success: false, error: 'Please wait 60 seconds before requesting another OTP.' };
        }
        
        // 5 requests per hour
        snapshot.docs.forEach(doc => {
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

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const saltRounds = 10;
      const hashedOtp = await bcrypt.hash(otpCode, saltRounds);

      // Save to Firestore
      const newOtpRef = adminDb.collection('phone_verifications').doc();
      await newOtpRef.set({
        phone,
        userId,
        hashedOtp,
        createdAt: now,
        expiresAt: now + 5 * 60 * 1000, // 5 minutes
        attempts: 0,
        type: 'fast2sms'
      });

      // Call Fast2SMS API
      const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
        route: 'otp',
        variables_values: otpCode,
        numbers: rawPhone,
        flash: "0"
      }, {
        headers: {
          'authorization': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.return === true) {
        return { success: true, message: 'OTP sent successfully.' };
      } else {
        console.error('[Fast2SMS] API failed:', response.data);
        return { success: false, error: 'Failed to send OTP. Please try again.' };
      }
    } catch (error: any) {
      console.error('[Fast2SMS] Exception:', error.message);
      return { success: false, error: 'An unexpected error occurred while sending OTP.' };
    }
  }

  public async verifyOtp(phone: string, code: string, userId: string): Promise<VerificationResult> {
    try {
      // Get the latest OTP for this phone
      const otpsRef = adminDb.collection('phone_verifications')
        .where('phone', '==', phone)
        .where('type', '==', 'fast2sms')
        .orderBy('createdAt', 'desc')
        .limit(1);
        
      const snapshot = await otpsRef.get();
      
      if (snapshot.empty) {
        return { success: false, error: 'No OTP found for this number.' };
      }

      const otpDoc = snapshot.docs[0];
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
