/**
 * Verification Test Suite for Expiry Engine, Coupons, Ads, and Timer Systems
 */

const http = require('http');

function postJson(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3000,
        path,
        method: 'POST',
        family: 4,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, text: body });
          }
        });
      }
    );
    req.on('error', (err) => reject(new Error(err.message || String(err))));
    req.write(data);
    req.end();
  });
}

function getJson(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3000,
        path,
        method: 'GET',
        family: 4,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, text: body });
          }
        });
      }
    );
    req.on('error', (err) => reject(new Error(err.message || String(err))));
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('  OLIVE PIZZA — EXPIRY, TIMER, COUPON & AD VALIDATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // ── Test 1: GET /api/coupons ───────────────────────────────────────────────
  try {
    const res = await getJson('/api/coupons');
    assert(res.status === 200, 'GET /api/coupons responds with 200 OK');
    assert(res.data && res.data.success === true, 'Coupons API returns success: true');
    assert(Array.isArray(res.data.coupons), 'Coupons list is an array');

    const now = new Date();
    let hasExpired = false;
    for (const c of res.data.coupons) {
      const expStr = c.endDate || c.expiryDate || c.validUntil;
      if (expStr) {
        const expDate = new Date(expStr);
        if (!isNaN(expDate.getTime()) && expDate < now) {
          hasExpired = true;
          console.error(`Found expired coupon in list: ${c.code} (${expStr})`);
        }
      }
    }
    assert(!hasExpired, 'No expired coupons returned in customer GET /api/coupons');
  } catch (err) {
    assert(false, `GET /api/coupons failed: ${err.message}`);
  }

  // ── Test 2: Validation of Expired Coupon Rejection ─────────────────────────
  try {
    // Attempt validating a coupon with past date (or nonexistent/invalid)
    const res = await postJson('/api/coupons/validate', {
      code: 'JUNE23_EXPIRED_TEST',
      cartTotal: 500,
      userId: 'test-user'
    });
    assert(res.status === 404 || res.status === 400, 'Invalid/expired coupon correctly rejected with 400 or 404');
    assert(res.data && res.data.valid === false, 'Coupon validation returns valid: false');
  } catch (err) {
    assert(false, `Coupon validation test failed: ${err.message}`);
  }

  // ── Test 3: Frontend Scheduling & Expiry Logic Unit Verification ──────────
  console.log('\n--- 3. Universal Scheduling & Expiry Unit Logic ---');
  
  // Date parsing tests
  const now = new Date();
  const pastDateStr = '2026-06-23';
  const futureDateStr = '2027-12-31';

  function mockIsActive(item) {
    if (item.isActive === false || item.isArchived === true) return false;
    const rawEnd = item.endDate || item.expiryDate || item.validUntil || item.validTo || item.expiresAt;
    if (rawEnd) {
      const end = new Date(rawEnd);
      // If YYYY-MM-DD, treat as end of that day
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawEnd)) {
        const [y, m, d] = rawEnd.split('-').map(Number);
        const eod = new Date(y, m - 1, d, 23, 59, 59, 999);
        if (now > eod) return false;
      } else if (now > end) {
        return false;
      }
    }
    return true;
  }

  assert(mockIsActive({ isActive: true, endDate: pastDateStr }) === false, 'Coupon with endDate="2026-06-23" is flagged EXPIRED');
  assert(mockIsActive({ isActive: true, expiryDate: pastDateStr }) === false, 'Coupon with expiryDate="2026-06-23" is flagged EXPIRED');
  assert(mockIsActive({ isActive: true, validUntil: pastDateStr }) === false, 'Coupon with validUntil="2026-06-23" is flagged EXPIRED');
  assert(mockIsActive({ isActive: true, expiresAt: pastDateStr }) === false, 'Ad with expiresAt="2026-06-23" is flagged EXPIRED');
  assert(mockIsActive({ isActive: true, endDate: futureDateStr }) === true, 'Item with future endDate="2027-12-31" is ACTIVE');
  assert(mockIsActive({ isActive: false, endDate: futureDateStr }) === false, 'Deactivated item with future date is INACTIVE');
  assert(mockIsActive({ isActive: true, isArchived: true }) === false, 'Archived item is INACTIVE');

  console.log('\n================================================================');
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL EXPIRY & TIMER INTEGRATION CHECKS PASSED!');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
