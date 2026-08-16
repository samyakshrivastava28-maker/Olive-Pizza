/**
 * Rapid Navigation & Order Flow Verification Script for Olive Pizza
 */

const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function fetchPath(path, options = {}) {
  const url = new URL(path, BASE_URL);
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        timeout: 5000,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            latencyMs: Date.now() - startTime,
            data,
            success: res.statusCode >= 200 && res.statusCode < 400,
          });
        });
      }
    );

    req.on('error', (err) => {
      resolve({
        statusCode: 500,
        latencyMs: Date.now() - startTime,
        error: err.message,
        success: false,
      });
    });

    if (options.body) req.write(options.body);
    req.end();
  });
}

async function runVerification() {
  console.log('==================================================');
  console.log('🍕 OLIVE PIZZA RAPID NAVIGATION & ORDER FLOW TEST');
  console.log('==================================================\n');

  let allPassed = true;

  // 1. Test Key Customer & Order Routes
  const navigationSequence = [
    { route: '/', name: 'Home Page' },
    { route: '/menu', name: 'Artisan Menu' },
    { route: '/cart', name: 'Shopping Cart' },
    { route: '/checkout', name: 'Checkout Page' },
    { route: '/recheck-order', name: 'Order Recheck' },
    { route: '/processing-order', name: 'Order Processing' },
    { route: '/order-tracking/test-order-123', name: 'Live Order Tracking' },
    { route: '/api/homepage/live', name: 'Homepage Live Manifest' },
    { route: '/health', name: 'System Health Check' },
  ];

  console.log('--- Step 1: Rapid 3-Cycle Navigation Sequence ---');
  const latencies = [];

  for (let cycle = 1; cycle <= 3; cycle++) {
    console.log(`\nCycle ${cycle}:`);
    for (const item of navigationSequence) {
      const res = await fetchPath(item.route);
      latencies.push(res.latencyMs);
      if (res.success || res.statusCode === 200 || res.statusCode === 304 || res.statusCode === 401) {
        console.log(`  ✓ ${item.name} (${item.route}) - HTTP ${res.statusCode} in ${res.latencyMs}ms`);
      } else {
        console.error(`  ❌ Failed: ${item.name} (${item.route}) - HTTP ${res.statusCode}`);
        allPassed = false;
      }
    }
  }

  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const maxLatency = Math.max(...latencies);

  console.log('\n==================================================');
  console.log('📊 PERFORMANCE SUMMARY:');
  console.log(`- Total Route Transitions: ${latencies.length}`);
  console.log(`- Average Transition Latency: ${avgLatency}ms`);
  console.log(`- Max Transition Latency: ${maxLatency}ms`);
  console.log('==================================================\n');

  if (allPassed) {
    console.log('🎉 RAPID NAVIGATION & ORDER ROUTE VERIFICATION SUCCEEDED!');
    process.exit(0);
  } else {
    console.error('❌ RAPID NAVIGATION VERIFICATION FAILED!');
    process.exit(1);
  }
}

runVerification();
