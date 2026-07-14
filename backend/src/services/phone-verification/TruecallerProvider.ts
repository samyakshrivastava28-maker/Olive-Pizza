import axios from 'axios';
import crypto from 'crypto';
import { PhoneVerificationProvider, VerificationResult } from './PhoneVerificationProvider.js';

interface TruecallerKey {
  keyType: string;
  key: string;
}

export class TruecallerProvider implements PhoneVerificationProvider {
  private publicKeys: TruecallerKey[] = [];
  private lastKeyFetch: number = 0;
  private readonly KEY_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {}

  private async getPublicKeys(): Promise<TruecallerKey[]> {
    const now = Date.now();
    if (this.publicKeys.length > 0 && now - this.lastKeyFetch < this.KEY_CACHE_DURATION) {
      return this.publicKeys;
    }

    try {
      const response = await axios.get('https://api4.truecaller.com/v1/key');
      if (Array.isArray(response.data)) {
        this.publicKeys = response.data;
        this.lastKeyFetch = now;
        return this.publicKeys;
      }
      throw new Error('Invalid key format received from Truecaller');
    } catch (error: any) {
      console.error('[Truecaller] Error fetching public keys:', error.message);
      throw error;
    }
  }

  public async verifyNativePayload(payloadBase64: string, signature: string, signatureAlgorithm?: string): Promise<VerificationResult> {
    try {
      // 1. Decode Payload
      const payloadString = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadString);

      // 2. Validate Replay/Timestamp
      const requestTime = payload.requestTime; // Unix timestamp
      const now = Date.now();
      // Allow 5 minutes of clock drift/validity
      if (!requestTime || Math.abs(now - requestTime) > 5 * 60 * 1000) {
         return { success: false, error: 'Verification request expired or timestamp invalid.' };
      }

      // 3. Fetch Keys
      const keys = await this.getPublicKeys();
      if (!keys || keys.length === 0) {
         return { success: false, error: 'Failed to fetch Truecaller validation keys.' };
      }

      // 4. Verify Signature
      const algo = signatureAlgorithm || 'SHA512withRSA';
      const signatureBuffer = Buffer.from(signature, 'base64');
      
      let verified = false;
      for (const key of keys) {
        // Construct PEM formatted public key
        let pem = key.key;
        if (!pem.includes('BEGIN PUBLIC KEY')) {
            const lines = pem.match(/.{1,64}/g)?.join('\n') || pem;
            pem = `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----\n`;
        }
        
        try {
          const verifier = crypto.createVerify(algo);
          verifier.update(payloadBase64);
          
          if (verifier.verify(pem, signatureBuffer)) {
            verified = true;
            break;
          }
        } catch (e) {
          // Ignore parse errors on individual keys, try next
        }
      }

      if (!verified) {
        return { success: false, error: 'Invalid Truecaller signature.' };
      }

      // 5. Success
      let formattedPhone = payload.phoneNumber;
      if (formattedPhone && !formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }

      return {
        success: true,
        phone: formattedPhone,
        provider: 'truecaller',
        name: `${payload.firstName || ''} ${payload.lastName || ''}`.trim(),
        country: payload.countryCode
      };

    } catch (error: any) {
      console.error('[Truecaller Verify] Exception:', error.message);
      return { success: false, error: 'Truecaller verification failed due to internal error.' };
    }
  }
}
