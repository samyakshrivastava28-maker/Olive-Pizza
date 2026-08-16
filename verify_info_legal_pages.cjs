/**
 * Verification Suite for Olive Pizza Legal, About & FAQ Pages
 */

const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function fetchPage(path) {
  const url = new URL(path, BASE_URL);
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/json',
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
            success: res.statusCode === 200 || res.statusCode === 304,
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

    req.end();
  });
}

async function runVerification() {
  console.log('==================================================');
  console.log('🍕 OLIVE PIZZA LEGAL, ABOUT & FAQ VERIFICATION');
  console.log('==================================================\n');

  let allPassed = true;

  // 1. Test All Redesigned Informational & Legal Routes
  const legalRoutes = [
    { route: '/privacy-policy', name: 'Privacy Policy' },
    { route: '/terms', name: 'Terms of Service' },
    { route: '/refund-policy', name: 'Refund Policy' },
    { route: '/delivery-policy', name: 'Delivery Policy' },
    { route: '/cookie-policy', name: 'Cookie Policy' },
    { route: '/cancellation-policy', name: 'Cancellation Policy' },
    { route: '/accessibility', name: 'Accessibility Statement' },
    { route: '/delete-account', name: 'Data Deletion / Privacy Center' },
    { route: '/about', name: 'About Olive Pizza' },
    { route: '/faq', name: 'Frequently Asked Questions' },
  ];

  console.log('--- Step 1: Informational & Legal Pages HTTP Response & Health ---');
  for (const item of legalRoutes) {
    const res = await fetchPage(item.route);
    if (res.success) {
      console.log(`  ✓ ${item.name.padEnd(32)} (${item.route}) -> HTTP ${res.statusCode} in ${res.latencyMs}ms`);
    } else {
      console.error(`  ❌ FAIL: ${item.name} (${item.route}) -> HTTP ${res.statusCode}`);
      allPassed = false;
    }
  }

  // 2. Test Protected Core Pages to ensure no regressions
  const protectedRoutes = [
    { route: '/', name: 'Home Page' },
    { route: '/menu', name: 'Artisan Menu' },
    { route: '/contact', name: 'Contact Page' },
    { route: '/cart', name: 'Cart' },
    { route: '/checkout', name: 'Checkout' },
    { route: '/health', name: 'Backend Health' },
  ];

  console.log('\n--- Step 2: Protected Pages Integrity Check ---');
  for (const item of protectedRoutes) {
    const res = await fetchPage(item.route);
    if (res.success) {
      console.log(`  ✓ ${item.name.padEnd(24)} (${item.route}) -> HTTP ${res.statusCode} in ${res.latencyMs}ms`);
    } else {
      console.error(`  ❌ FAIL: ${item.name} (${item.route}) -> HTTP ${res.statusCode}`);
      allPassed = false;
    }
  }

  console.log('\n==================================================');
  if (allPassed) {
    console.log('🎉 ALL LEGAL, ABOUT & FAQ PAGES ARE HEALTHY AND PASSING!');
    console.log('==================================================\n');
    process.exit(0);
  } else {
    console.error('❌ VERIFICATION ENCOUNTERED ERRORS!');
    console.log('==================================================\n');
    process.exit(1);
  }
}

runVerification();
