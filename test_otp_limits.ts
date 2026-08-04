import { adminDb } from './backend/src/config/firebase.js';
import { Fast2SMSProvider } from './backend/src/services/phone-verification/Fast2SMSProvider.js';

// Setup DEV environment mock
process.env.FAST2SMS_API_KEY = 'Za4NPkWAO6DJTjcxCo2imyh15sBrLQGpvqU0FY8nu7eMEzdlSfnuPp4OlrDWvohixTFUIBawKR3JNCV2';
process.env.PHONE_AUTH_MODE = 'production';

async function runTests() {
  console.log("=== Fast2SMS Production Integration Test ===");
  const provider = new Fast2SMSProvider();
  
  const testPhone = "+919999999991";
  const userId = "test_user_id";
  
  // Cleanup old OTPs for test phone
  console.log("Cleaning up old test OTPs...");
  const otpsRef = adminDb.collection('phone_verifications').where('phone', '==', testPhone);
  const snapshot = await otpsRef.get();
  const batch = adminDb.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  console.log("\\n--- Test 1: Send Initial OTP ---");
  let res1 = await provider.sendOtp(testPhone, userId);
  console.log(res1);

  console.log("\\n--- Test 2: Rate Limit - Cooldown (Immediate Resend) ---");
  let res2 = await provider.sendOtp(testPhone, userId);
  console.log(res2); // Should fail with 60-second cooldown

  console.log("\\n--- Test 3: OTP Verification Bypass Denial in Production ---");
  let res3 = await provider.verifyOtp(testPhone, "123456", userId);
  console.log(res3); // Should fail in production mode

  console.log("\\n--- Test 4: Delete OTP after max wrong attempts ---");
  let wrongCount = 0;
  while(wrongCount < 6) {
    let res = await provider.verifyOtp(testPhone, "000000", userId);
    console.log(`Wrong attempt ${wrongCount + 1}:`, res.success ? "Success" : res.error);
    wrongCount++;
    if (res.error?.includes('Maximum attempts reached')) break;
    if (res.error?.includes('Maximum verification attempts exceeded')) break;
  }
  
  console.log("\\n--- Finished Tests ---");
  process.exit(0);
}

runTests().catch(console.error);
