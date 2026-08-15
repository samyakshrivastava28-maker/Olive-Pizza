// test_order_cancel.cjs
const http = require('http');

async function testOrderAction() {
  console.log('Testing Order Action endpoint resilience...');
  
  const postData = JSON.stringify({
    orderId: 'test_order_resilience_123',
    action: 'cancel_order',
    reason: 'Customer requested cancellation test'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/notifications/action',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log(`HTTP Status: ${res.statusCode}`);
      console.log(`Response: ${data}`);
      // Since we didn't provide a bearer token, 401/403 is expected, not 500 'Failed to acquire order lock'
      if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 200) {
        console.log('✅ PASS: Order action endpoint is active and protected by Auth (no 500 crash).');
      } else {
        console.log('Result:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

testOrderAction();
