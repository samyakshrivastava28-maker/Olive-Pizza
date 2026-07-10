import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 
    ? Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8') 
    : '';
  
  if (serviceAccountStr) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountStr))
    });
  } else {
      console.log('NO FIREBASE SERVICE ACCOUNT PROVIDED');
      process.exit(1);
  }
}

async function testAndroidTokens() {
  const db = admin.firestore();
  
  console.log('[Test] Querying Firestore users for tokens...');
  const usersSnapshot = await db.collection('users').get();
  
  let targetToken = null;
  for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      if (data.fcmTokens && data.fcmTokens.length > 0) {
          targetToken = data.fcmTokens[data.fcmTokens.length - 1]; // get latest token
          break;
      }
  }

  if (!targetToken) {
    console.log('No FCM tokens found in Firestore users collection.');
    return;
  }

  console.log(`Target Token: ${targetToken.substring(0, 20)}...`);

  const message: admin.messaging.Message = {
    token: targetToken,
    notification: {
      title: 'Android Direct Test',
      body: 'This is a direct FCM test from the backend to verify Android delivery.',
    },
    data: {
      stage: 'new_order',
      orderId: 'TEST-123',
      url: 'https://olive-pizza.vercel.app/owner/dashboard'
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'olive_pizza_alerts',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK'
      }
    },
    webpush: {
      headers: { Urgency: 'high' }
    }
  };

  console.log('[Test] Sending payload:', JSON.stringify(message, null, 2));
  
  try {
    const response = await admin.messaging().send(message);
    console.log('✅ SUCCESS! Message ID:', response);
  } catch (e: any) {
    console.log('❌ FAIL! Error:', e.code, e.message);
    console.log(e);
  }
}

testAndroidTokens().catch(console.error).then(() => process.exit(0));
