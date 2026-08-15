const http = require('http');

const ENDPOINTS_TO_TEST = [
  { path: '/health', expectedStatus: 200, name: 'Backend Health Check' },
  { path: '/api/auth/verify-recaptcha', method: 'POST', body: JSON.stringify({ token: 'test', action: 'test' }), expectedStatus: 200, name: 'Recaptcha Dev Bypass' },
  { path: '/api/orders', expectedStatus: 401, name: 'Order Route (Protected)' },
  { path: '/api/delivery/status', expectedStatus: 401, name: 'Delivery Route (Protected)' },
  { path: '/api/notifications/send-custom', method: 'POST', body: JSON.stringify({}), expectedStatus: 429, name: 'Notifications Route (Rate Limited/Protected)' }, 
  { path: '/api/reports/monthly', expectedStatus: 401, name: 'Reports Route (Rate Limited/Protected)' },
];

async function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: endpoint.path,
      method: endpoint.method || 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', error => {
      reject(error);
    });

    if (endpoint.body) {
      req.write(endpoint.body);
    }
    req.end();
  });
}

async function runTests() {
  console.log('==================================================');
  console.log('OLIVE PIZZA CORE WORKFLOW VERIFICATION');
  console.log('==================================================\n');

  let allPassed = true;

  for (const endpoint of ENDPOINTS_TO_TEST) {
    try {
      console.log(`Testing: ${endpoint.name} (${endpoint.method || 'GET'} ${endpoint.path})`);
      const result = await makeRequest(endpoint);
      
      // Allow both 429 and 401 because depending on how the middleware stack is layered, it might hit the rate limiter first or the auth wall first.
      if (result.status === endpoint.expectedStatus || (endpoint.expectedStatus === 429 && result.status === 401) || (endpoint.expectedStatus === 401 && result.status === 429)) {
        console.log(`✅ PASS: Received expected status ${result.status}\n`);
      } else {
        console.log(`❌ FAIL: Expected status ${endpoint.expectedStatus}, but got ${result.status}`);
        console.log(`Response: ${result.data}\n`);
        allPassed = false;
      }
    } catch (err) {
      console.log(`❌ FAIL: Request error: ${err.message}\n`);
      allPassed = false;
    }
  }

  console.log('==================================================');
  if (allPassed) {
    console.log('🎉 ALL CORE ROUTES VERIFIED ALIVE AND RESPONDING');
  } else {
    console.log('⚠️ REGRESSIONS DETECTED');
    process.exit(1);
  }
}

runTests();
