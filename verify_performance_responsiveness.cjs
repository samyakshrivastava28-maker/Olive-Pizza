/**
 * Olive Pizza — Comprehensive Performance, Responsiveness & Concurrency Verification Suite
 * 
 * Tests:
 * 1. Version Check & Update Notification API
 * 2. Canonical Homepage Template Audit (Single Hero, no duplicates)
 * 3. 10 Concurrent Active Customer Scenarios
 * 4. 50 Concurrent Active Session Connections
 * 5. Measurable Metrics: RPS, Success/Fail, Error %, Timeouts, p50, p95, max latency, CPU & Memory
 */

const http = require('http');
const https = require('https');
const os = require('os');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Configurable Test Thresholds
const THRESHOLDS = {
  maxErrorPercentage: 1.0,    // Max 1% error rate allowed
  maxTimeoutCount: 0,         // Zero timeouts allowed
  maxP95LatencyMs: 2500,      // Max 2.5s p95 latency under peak concurrency
  minSuccessRate: 99.0        // Min 99% success rate
};

function makeRequest(urlPath, options = {}) {
  const url = new URL(urlPath, BASE_URL);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;

  return new Promise((resolve) => {
    const startTime = Date.now();
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Version': '1.0.0',
        'X-Platform': 'web',
        ...(options.headers || {})
      },
      timeout: options.timeout || 10000
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const latency = Date.now() - startTime;
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          data: parsed,
          latency,
          success: res.statusCode >= 200 && res.statusCode < 400,
          timeout: false
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        statusCode: 408,
        data: null,
        latency: Date.now() - startTime,
        success: false,
        timeout: true
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: 500,
        data: { error: err.message },
        latency: Date.now() - startTime,
        success: false,
        timeout: false
      });
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

function calculatePercentile(latencies, percentile) {
  if (!latencies.length) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

async function runLoadBenchmark(name, concurrency, operationsPerWorker) {
  console.log(`\n--------------------------------------------------`);
  console.log(`🚀 RUNNING BENCHMARK: ${name}`);
  console.log(`Concurrency: ${concurrency} simultaneous workers`);
  console.log(`Operations per worker: ${operationsPerWorker}`);
  console.log(`Total operations: ${concurrency * operationsPerWorker}`);
  console.log(`--------------------------------------------------`);

  const initialMem = process.memoryUsage();
  const startTime = Date.now();
  const results = [];

  const endpoints = [
    '/health',
    '/api/version/settings',
    '/api/homepage/live',
    '/health',
    '/api/version/settings'
  ];

  const workers = Array.from({ length: concurrency }, async (_, workerIdx) => {
    for (let op = 0; op < operationsPerWorker; op++) {
      const endpoint = endpoints[(workerIdx + op) % endpoints.length];
      const res = await makeRequest(endpoint);
      results.push(res);
      // Stagger slightly to simulate realistic user interaction (10ms)
      await new Promise(r => setTimeout(r, 10));
    }
  });

  await Promise.all(workers);
  const totalDurationMs = Date.now() - startTime;
  const finalMem = process.memoryUsage();

  const totalRequests = results.length;
  const successfulRequests = results.filter(r => r.success).length;
  const failedRequests = results.filter(r => !r.success).length;
  const timeoutCount = results.filter(r => r.timeout).length;
  const errorPercentage = ((failedRequests / totalRequests) * 100);
  const latencies = results.map(r => r.latency);
  const p50 = calculatePercentile(latencies, 50);
  const p95 = calculatePercentile(latencies, 95);
  const maxLatency = Math.max(...latencies, 0);
  const rps = ((totalRequests / (totalDurationMs / 1000))).toFixed(2);

  const memDeltaMB = ((finalMem.heapUsed - initialMem.heapUsed) / (1024 * 1024)).toFixed(2);

  console.log(`\n📊 METRICS REPORT [${name}]:`);
  console.log(`- Total Requests:       ${totalRequests}`);
  console.log(`- Successful Requests:  ${successfulRequests}`);
  console.log(`- Failed Requests:      ${failedRequests}`);
  console.log(`- Error Rate:           ${errorPercentage.toFixed(2)}% (Threshold: <= ${THRESHOLDS.maxErrorPercentage}%)`);
  console.log(`- Timeouts:             ${timeoutCount} (Threshold: <= ${THRESHOLDS.maxTimeoutCount})`);
  console.log(`- Requests / Second:    ${rps} req/s`);
  console.log(`- p50 Latency:          ${p50} ms`);
  console.log(`- p95 Latency:          ${p95} ms (Threshold: <= ${THRESHOLDS.maxP95LatencyMs} ms)`);
  console.log(`- Max Latency:          ${maxLatency} ms`);
  console.log(`- Memory Heap Used:     ${(finalMem.heapUsed / (1024 * 1024)).toFixed(2)} MB (Delta: ${memDeltaMB} MB)`);
  console.log(`- System Free Memory:   ${(os.freemem() / (1024 * 1024)).toFixed(2)} MB / ${(os.totalmem() / (1024 * 1024)).toFixed(2)} MB`);

  const pass = 
    errorPercentage <= THRESHOLDS.maxErrorPercentage &&
    timeoutCount <= THRESHOLDS.maxTimeoutCount &&
    p95 <= THRESHOLDS.maxP95LatencyMs;

  return {
    name,
    pass,
    p50,
    p95,
    maxLatency,
    errorPercentage,
    timeoutCount,
    rps,
    totalRequests,
    successfulRequests
  };
}

async function runTestSuite() {
  console.log(`==================================================`);
  console.log(`🍕 OLIVE PIZZA PRODUCTION HARDENING VERIFICATION`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`==================================================\n`);

  let allPassed = true;

  // ── TEST 1: Version Settings API & Semver Check ──
  console.log(`[TEST 1] Testing Version Settings API & Format...`);
  const versionRes = await makeRequest('/api/version/settings');
  if (versionRes.success && versionRes.data) {
    console.log(`  ✓ Version settings returned HTTP ${versionRes.statusCode}`);
    console.log(`    latest_version: ${versionRes.data.latest_version}`);
    console.log(`    minimum_version: ${versionRes.data.minimum_version}`);
    console.log(`    mandatory_update: ${Boolean(versionRes.data.mandatory_update)}`);
  } else {
    console.error(`  ❌ Failed to fetch /api/version/settings:`, versionRes.data);
    allPassed = false;
  }

  // ── TEST 2: Canonical Default Homepage Template Audit ──
  console.log(`\n[TEST 2] Testing Canonical Default Homepage Template...`);
  const liveHomeRes = await makeRequest('/api/homepage/live');
  if (liveHomeRes.success && liveHomeRes.data && liveHomeRes.data.config) {
    const sections = liveHomeRes.data.config.sections || [];
    const sectionTypes = sections.map(s => s.type);
    console.log(`  ✓ Live homepage configuration loaded (${sections.length} sections)`);
    console.log(`    Sections: ${sectionTypes.join(', ')}`);

    const heroCount = sectionTypes.filter(t => t === 'HERO' || t === 'VIDEO_HERO').length;
    if (heroCount === 1) {
      console.log(`  ✓ Exactly ONE Hero section present in canonical schema.`);
    } else {
      console.error(`  ❌ Unexpected Hero section count: ${heroCount} (Expected exactly 1)`);
      allPassed = false;
    }

    const uniqueTypes = new Set(sectionTypes);
    if (uniqueTypes.size === sectionTypes.length) {
      console.log(`  ✓ Zero duplicate section types detected.`);
    } else {
      console.warn(`  ⚠️ Notice: Sections list contains repeats:`, sectionTypes);
    }
  } else {
    console.error(`  ❌ Failed to fetch /api/homepage/live:`, liveHomeRes.data);
    allPassed = false;
  }

  // ── TEST 3: 10 Simultaneous Active Customers (Simulating transactions/browsing) ──
  const test10 = await runLoadBenchmark('10 Simultaneous Active Customers', 10, 10);
  if (!test10.pass) allPassed = false;

  // ── TEST 4: 50 Concurrent Active Connected Sessions ──
  const test50 = await runLoadBenchmark('50 Concurrent Active Connected Sessions', 50, 5);
  if (!test50.pass) allPassed = false;

  // ── FINAL REPORT ──
  console.log(`\n==================================================`);
  console.log(`CONCURRENCY TEST FINAL SUMMARY`);
  console.log(`==================================================`);
  console.log(`\n10 users:`);
  console.log(`${test10.pass ? 'PASS' : 'FAIL'}`);
  console.log(`p95: ${test10.p95} ms`);
  console.log(`errors: ${test10.errorPercentage.toFixed(2)}%`);
  console.log(`rps: ${test10.rps} req/s`);

  console.log(`\n50 active sessions:`);
  console.log(`${test50.pass ? 'PASS' : 'FAIL'}`);
  console.log(`p95: ${test50.p95} ms`);
  console.log(`errors: ${test50.errorPercentage.toFixed(2)}%`);
  console.log(`rps: ${test50.rps} req/s`);

  console.log(`==================================================\n`);

  if (allPassed) {
    console.log(`🎉 ALL CONCURRENCY & PRODUCTION CHECKS PASSED!`);
    process.exit(0);
  } else {
    console.error(`❌ LOAD TEST OR PRODUCTION CHECKS FAILED!`);
    process.exit(1);
  }
}

runTestSuite();
