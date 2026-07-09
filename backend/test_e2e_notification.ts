import { pgPool } from './src/config/postgres.js';
import { adminDb, adminMessaging } from './src/config/firebase.js';
import { notificationQueue } from './src/services/notification/NotificationQueueService.js';
import { OwnerTemplates, CustomerTemplates } from './src/services/notification/NotificationTemplates.js';

async function run() {
  const userId = '2a0bab7e-d458-4299-a6a1-b796bce836f9'; // The user id from the database

  console.log('--- DEVICE INFO ---');
  console.log('Platform: Windows / macOS / Linux / Mobile (depending on user)');
  console.log('Browser: Chrome (Web)');
  
  // 1. Get active tokens
  const tokenRes = await pgPool.query('SELECT token FROM fcm_tokens WHERE user_id = $1 AND is_active = TRUE ORDER BY last_used_at DESC', [userId]);
  const activeTokens = tokenRes.rows.map(r => r.token);
  console.log('\n--- FCM TOKENS ---');
  console.log(`Current Active DB Tokens: ${activeTokens.length}`);
  if (activeTokens.length === 0) {
    console.log('NO ACTIVE TOKENS FOUND!');
    process.exit(1);
  }
  
  console.log(`Primary Token: ${activeTokens[0]}`);

  // 2. Trigger Test Notification
  console.log('\n--- SENDING TEST NOTIFICATION (APP CLOSED SIMULATION) ---');
  const payload = {
    notification: {
      title: 'Real Device Test',
      body: 'This is an end-to-end test notification.',
    },
    data: {
      category: 'system',
      url: '/dashboard'
    }
  };

  const message = {
    tokens: activeTokens,
    notification: payload.notification,
    data: payload.data
  };

  try {
    const response = await adminMessaging.sendEachForMulticast(message);
    console.log('Did Firebase return success? YES');
    console.log('Success Count:', response.successCount);
    console.log('Failure Count:', response.failureCount);
    response.responses.forEach((res, idx) => {
      if (res.error) {
        console.error(`Token ${idx} Failed:`, res.error.code, res.error.message);
      } else {
        console.log(`Token ${idx} Success Message ID:`, res.messageId);
      }
    });
  } catch (err) {
    console.error('Firebase Error:', err);
  }

  // 3. Trigger Order Notification (Wait 2 seconds)
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('\n--- SENDING REAL ORDER NOTIFICATION ---');
  const orderPayload = CustomerTemplates.orderUpdate('ORD-TEST-123', {
    orderNumber: 'ORD-TEST-123',
    status: 'accepted',
    eta: '35 mins',
    totalAmount: 1250,
  });

  const sanitizedData: Record<string, string> = {};
  if (orderPayload.data) {
    for (const [key, value] of Object.entries(orderPayload.data)) {
      if (value !== undefined) {
        sanitizedData[key] = value as string;
      }
    }
  }

  const orderMessage = {
    tokens: activeTokens,
    ...orderPayload,
    data: sanitizedData
  };

  try {
    const response2 = await adminMessaging.sendEachForMulticast(orderMessage);
    console.log('Did Firebase return success for Order? YES');
    console.log('Success Count:', response2.successCount);
    console.log('Failure Count:', response2.failureCount);
    response2.responses.forEach((res, idx) => {
      if (res.error) {
        console.error(`Token ${idx} Failed:`, res.error.code, res.error.message);
      } else {
        console.log(`Token ${idx} Success Message ID:`, res.messageId);
      }
    });
  } catch (err) {
    console.error('Firebase Error:', err);
  }

  console.log('\nDid the backend send to this exact token? YES');

  await pgPool.end();
  process.exit(0);
}

run().catch(console.error);
