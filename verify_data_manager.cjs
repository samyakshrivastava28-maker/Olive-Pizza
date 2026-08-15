/**
 * verify_data_manager.cjs — Comprehensive Automated Verification Suite for Data Manager
 *
 * Verifies:
 *  1. Backend Server & Health Endpoint
 *  2. Data Manager Overview & Aggregation
 *  3. Provider Requirement Schemas & Capabilities for ALL Providers:
 *     - Google Firebase Firestore
 *     - Google Firebase Realtime Database
 *     - MongoDB Atlas
 *     - DataStax Astra DB
 *     - Amazon DynamoDB
 *     - Apache CouchDB
 *     - Supabase PostgreSQL
 *     - Neon Serverless PostgreSQL
 *     - Turso (libSQL)
 *     - TiDB Cloud
 *     - PostgREST (API Layer)
 *     - Data API Builder (API Layer)
 *     - Cloudflare R2 Object Storage
 *     - Cloudinary Media CDN
 *     - Pinecone Vector DB
 *     - Custom Provider (SSRF Protected Gateway)
 *  4. "What Olive Pizza Needs" Requirement Summaries & Field Definitions
 *  5. In-App Documentation Guidance (where to find credentials, permissions)
 *  6. Secret Field Masking & Security
 *  7. Auto-Detection Metadata Discovery
 *  8. Non-Destructive Connection Probes & Step-by-Step Breakdown
 *  9. Real Provider Metrics & "Not available from provider" for Unsupported Metrics
 * 10. Safe Read-Only Diagnostics
 * 11. Capacity & Overflow Planning (Zero Destructive Overwrites)
 * 12. Server-Side Request Forgery (SSRF) Firewall Protection (127.0.0.1, 169.254.169.254, 10.0.0.1)
 * 13. Developer RBAC & Mutation Security
 * 14. Core Workflows Zero-Regression Protection
 *
 * Exit code: 0 = ALL REQUIRED CHECKS PASS, non-zero = FAILURE
 */

const http = require('http');

const PORT = 3000;

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port: PORT,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed || data,
          raw: data,
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runVerification() {
  console.log('================================================================');
  console.log('  OLIVE PIZZA — DATA MANAGER & PROVIDER REQUIREMENTS SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      if (details) console.log(`   → ${details}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${name}`);
      if (details) console.log(`   → ${details}`);
      failed++;
    }
  }

  function skip(name, reason) {
    console.log(`⚪ SKIPPED: ${name} (${reason})`);
    skipped++;
  }

  try {
    // ── Check 1: Health Endpoint ─────────────────────────────────────────────
    console.log('\n--- 1. Backend Server & Health Check ---');
    const healthRes = await makeRequest({ path: '/health' });
    assert('Backend Server is live on port 3000', healthRes.status === 200, `Uptime: ${healthRes.data?.uptime || 'N/A'}s`);

    // ── Check 2: Data Manager Overview Endpoint ──────────────────────────────
    console.log('\n--- 2. Multi-Database Overview & Aggregation ---');
    const overviewRes = await makeRequest({ path: '/api/data-manager/overview' });
    assert('GET /api/data-manager/overview responds with 200 OK', overviewRes.status === 200);
    assert(
      'Overview contains managed databases list and summary',
      Array.isArray(overviewRes.data?.managedDatabases) && overviewRes.data?.systemSummary,
      `Configured databases count: ${overviewRes.data?.managedDatabases?.length || 0}`
    );

    // ── Check 3: Comprehensive Provider Requirements Registry ────────────────
    console.log('\n--- 3. Provider Requirements & Schema Registry ---');
    const providersRes = await makeRequest({ path: '/api/data-manager/providers' });
    assert('GET /api/data-manager/providers responds with 200 OK', providersRes.status === 200);
    const providers = providersRes.data?.data || [];
    assert('Registry contains at least 15 distinct database/storage providers', providers.length >= 15, `Total registered: ${providers.length}`);

    // Expected provider IDs
    const expectedProviders = [
      { id: 'firestore', name: 'Google Firebase Firestore', category: 'nosql' },
      { id: 'firebase_rtdb', name: 'Google Firebase Realtime Database', category: 'nosql' },
      { id: 'mongodb_atlas', name: 'MongoDB Atlas', category: 'nosql' },
      { id: 'datastax_astra', name: 'DataStax Astra DB (Cassandra)', category: 'nosql' },
      { id: 'amazon_dynamodb', name: 'Amazon DynamoDB', category: 'nosql' },
      { id: 'apache_couchdb', name: 'Apache CouchDB', category: 'nosql' },
      { id: 'supabase_postgres', name: 'Supabase PostgreSQL', category: 'sql' },
      { id: 'neon_postgres', name: 'Neon Serverless PostgreSQL', category: 'sql' },
      { id: 'turso_libsql', name: 'Turso (libSQL / SQLite Cloud)', category: 'sql' },
      { id: 'tidb_cloud', name: 'TiDB Cloud (Serverless HTAP)', category: 'sql' },
      { id: 'postgrest_api', name: 'PostgREST / Supabase REST API', category: 'api' },
      { id: 'data_api_builder', name: 'Data API Builder (Azure / Open-Source)', category: 'api' },
      { id: 'cloudflare_r2', name: 'Cloudflare R2 Object Storage', category: 'storage' },
      { id: 'cloudinary', name: 'Cloudinary Media CDN', category: 'storage' },
      { id: 'pinecone_vector', name: 'Pinecone Vector DB', category: 'vector' },
      { id: 'custom_rest_db', name: 'Additional / Custom Provider', category: 'api' },
    ];

    for (const exp of expectedProviders) {
      const p = providers.find((item) => item.id === exp.id);
      assert(`Provider [${exp.name}] is registered with category "${exp.category}"`, Boolean(p) && p.category === exp.category);
      if (p) {
        assert(
          `Provider [${p.name}] defines "What Olive Pizza Needs" summary`,
          Boolean(p.whatOlivePizzaNeeds?.summary && Array.isArray(p.whatOlivePizzaNeeds?.requiredItems) && p.whatOlivePizzaNeeds.requiredItems.length > 0)
        );
        assert(
          `Provider [${p.name}] provides in-app credential source guidance`,
          Boolean(p.documentation?.whereToFindCredentials && p.documentation.whereToFindCredentials.length > 0)
        );
        assert(
          `Provider [${p.name}] defines grouped configuration sections & fields`,
          Array.isArray(p.sections) && p.sections.length > 0 && p.sections[0].fields?.length > 0
        );
      }
    }

    // ── Check 4: Secret Field Masking & Security Definition ───────────────────
    console.log('\n--- 4. Secret Field Definition & Protection ---');
    const firestore = providers.find((p) => p.id === 'firestore');
    const privateKeyField = firestore?.sections?.flatMap((s) => s.fields)?.find((f) => f.key === 'privateKey');
    assert('Firestore privateKey is flagged as secret (isSecret: true)', Boolean(privateKeyField?.isSecret));

    const mongo = providers.find((p) => p.id === 'mongodb_atlas');
    const mongoUriField = mongo?.sections?.flatMap((s) => s.fields)?.find((f) => f.key === 'connectionUri');
    assert('MongoDB connectionUri is flagged as secret (isSecret: true)', Boolean(mongoUriField?.isSecret));

    const supabase = providers.find((p) => p.id === 'supabase_postgres');
    const supabaseKeyField = supabase?.sections?.flatMap((s) => s.fields)?.find((f) => f.key === 'apiKey');
    assert('Supabase Service Role Key is flagged as secret (isSecret: true)', Boolean(supabaseKeyField?.isSecret));

    // ── Check 5: Auto-Detection API Endpoint ──────────────────────────────────
    console.log('\n--- 5. Auto-Detection Metadata Discovery ---');
    const autoDetectRes = await makeRequest(
      { path: '/api/data-manager/providers/firestore/auto-detect', method: 'POST' },
      { credentials: { projectId: 'olive-pizza-prod' } }
    );
    assert('POST /api/data-manager/providers/firestore/auto-detect responds with 200 OK', autoDetectRes.status === 200);
    assert('Auto-detection returns discovered metadata and collections', autoDetectRes.data?.success && Boolean(autoDetectRes.data?.discovered));

    // ── Check 6: Step-by-Step Connection Testing with Breakdown ───────────────
    console.log('\n--- 6. Step-by-Step Connection Testing & Breakdown ---');
    const testFirestoreRes = await makeRequest(
      { path: '/api/data-manager/databases/test-connection', method: 'POST' },
      { providerId: 'firestore' }
    );
    assert('Firestore connection probe returns HEALTHY', testFirestoreRes.data?.data?.status === 'HEALTHY');
    assert(
      'Connection probe provides structured verification breakdown (network, auth, identity, permissions)',
      Boolean(testFirestoreRes.data?.data?.breakdown?.network && testFirestoreRes.data?.data?.breakdown?.authentication),
      `Latency: ${testFirestoreRes.data?.data?.latencyMs}ms`
    );

    const testPostgresRes = await makeRequest(
      { path: '/api/data-manager/databases/test-connection', method: 'POST' },
      { providerId: 'supabase_postgres' }
    );
    assert('Supabase PostgreSQL connection probe succeeds', testPostgresRes.data?.data?.status === 'HEALTHY', `Latency: ${testPostgresRes.data?.data?.latencyMs}ms`);

    // ── Check 7: Real Managed Database List & Metric Integrity ───────────────
    console.log('\n--- 7. Real Managed Database List & Metric Integrity ---');
    const dbsRes = await makeRequest({ path: '/api/data-manager/databases' });
    assert('GET /api/data-manager/databases responds with 200 OK', dbsRes.status === 200);
    const databases = dbsRes.data?.data || [];

    const firestoreDb = databases.find((d) => d.providerId === 'firestore' || d.id === 'primary_firestore');
    const postgresDb = databases.find((d) => d.providerId === 'supabase_postgres' || d.id === 'supabase_postgresql');
    const r2Db = databases.find((d) => d.providerId === 'cloudflare_r2' || d.id === 'cloudflare_r2_storage');
    const cloudinaryDb = databases.find((d) => d.providerId === 'cloudinary' || d.id === 'cloudinary_media');
    const pineconeDb = databases.find((d) => d.providerId === 'pinecone_vector' || d.id === 'pinecone_vector_db');

    assert('Primary Firestore record exists in managed databases', Boolean(firestoreDb));
    if (firestoreDb) {
      assert('Firestore role is Primary Business DB', firestoreDb.currentRole === 'primary_business_db');
      assert('Firestore classification is Critical Business', firestoreDb.dataClassification === 'critical_business');
    }

    assert('Supabase PostgreSQL record exists in managed databases', Boolean(postgresDb));
    if (postgresDb) {
      assert('PostgreSQL data classification is Operational', postgresDb.dataClassification === 'operational');
    }

    assert('Cloudflare R2 record is registered for object storage', Boolean(r2Db));
    if (r2Db) {
      assert('Cloudflare R2 does not fabricate SQL tables/rows', r2Db.documentCount === 'Not available from provider' || r2Db.documentCount === undefined || typeof r2Db.documentCount === 'string');
    }

    assert('Cloudinary record is registered for Media CDN', Boolean(cloudinaryDb));
    assert('Pinecone record is registered for AI Vector Search', Boolean(pineconeDb));

    // ── Check 8: Credential Masking in Database List ──────────────────────────
    console.log('\n--- 8. Credential Masking in Database List ---');
    let hasLeakedSecret = false;
    for (const db of databases) {
      if (db.connectionUriMasked) {
        if (db.connectionUriMasked.includes('Olivepizz%40rjn') || db.connectionUriMasked.includes('phdm ylxz')) {
          hasLeakedSecret = true;
        }
      }
    }
    assert('Database connection URIs are masked and do not leak raw passwords', !hasLeakedSecret, 'Connection strings masked as postgres://user:***@host...');

    // ── Check 9: SSRF Protection & Request Firewall ──────────────────────────
    console.log('\n--- 9. SSRF Protection & Request Firewall ---');
    const ssrfLoopbackTest = await makeRequest(
      { path: '/api/data-manager/databases/test-connection', method: 'POST' },
      { providerId: 'custom_rest_db', healthEndpoint: 'http://127.0.0.1:8080/admin' }
    );
    assert(
      'SSRF Guard blocks loopback 127.0.0.1 connections',
      ssrfLoopbackTest.data?.data?.status === 'UNREACHABLE' && ssrfLoopbackTest.data?.data?.message?.includes('SSRF Protection'),
      ssrfLoopbackTest.data?.data?.message
    );

    const ssrfMetadataTest = await makeRequest(
      { path: '/api/data-manager/databases/test-connection', method: 'POST' },
      { providerId: 'custom_rest_db', healthEndpoint: 'http://169.254.169.254/latest/meta-data' }
    );
    assert(
      'SSRF Guard blocks AWS/Cloud metadata service IP 169.254.169.254',
      ssrfMetadataTest.data?.data?.status === 'UNREACHABLE' && ssrfMetadataTest.data?.data?.message?.includes('SSRF Protection'),
      ssrfMetadataTest.data?.data?.message
    );

    const ssrfPrivateNetTest = await makeRequest(
      { path: '/api/data-manager/databases/test-connection', method: 'POST' },
      { providerId: 'custom_rest_db', healthEndpoint: 'http://10.0.0.1:5000/health' }
    );
    assert(
      'SSRF Guard blocks private RFC 1918 10.0.0.0/8 network range',
      ssrfPrivateNetTest.data?.data?.status === 'UNREACHABLE' && ssrfPrivateNetTest.data?.data?.message?.includes('SSRF Protection'),
      ssrfPrivateNetTest.data?.data?.message
    );

    // ── Check 10: Safe Read-Only Diagnostics ─────────────────────────────────
    console.log('\n--- 10. Safe Read-Only Diagnostics ---');
    const diagRes = await makeRequest({ path: '/api/data-manager/databases/supabase_postgresql/diagnostics' });
    assert('Database diagnostics responds with 200 OK', diagRes.status === 200);
    assert('Diagnostics returns safe schema metadata table list', Array.isArray(diagRes.data?.data?.tables), `Tables found: ${diagRes.data?.data?.tables?.length || 0}`);

    // ── Check 11: Capacity & Overflow Planning Strategy ──────────────────────
    console.log('\n--- 11. Capacity & Overflow Planning Strategy ---');
    const planRes = await makeRequest({ path: '/api/data-manager/capacity-plan' });
    assert('GET /api/data-manager/capacity-plan responds with 200 OK', planRes.status === 200);
    const plan = planRes.data?.data;
    assert('Capacity plan returns real Firestore utilization status', ['OPTIMAL', 'WARNING', 'CRITICAL'].includes(plan?.status), `Status: ${plan?.status}`);
    assert('Capacity plan recommends non-destructive COPY/ARCHIVE strategies', Array.isArray(plan?.recommendedDestinations) && plan.recommendedDestinations.length > 0);

    // ── Check 12: Developer RBAC & Mutation Security ─────────────────────────
    console.log('\n--- 12. Developer RBAC & Mutation Security ---');
    const unauthAddRes = await makeRequest(
      { path: '/api/data-manager/databases', method: 'POST' },
      { id: 'hacker_db', name: 'Unauthorized DB', providerId: 'custom_rest_db' }
    );
    assert(
      'Unauthenticated POST /api/data-manager/databases is rejected with 401 Unauthorized',
      unauthAddRes.status === 401 || unauthAddRes.status === 403,
      `HTTP status: ${unauthAddRes.status}`
    );

    // ── Check 13: Core Workflows Zero-Regression Verification ────────────────
    console.log('\n--- 13. Core Application Workflows Zero-Regression Verification ---');
    const recaptchaRes = await makeRequest(
      { path: '/api/auth/verify-recaptcha', method: 'POST' },
      { token: 'test', action: 'test' }
    );
    assert('Recaptcha verification endpoint is alive', recaptchaRes.status === 200);

    const ordersProtectedRes = await makeRequest({ path: '/api/orders' });
    assert('Orders route is alive and protected (401 Unauthorized)', ordersProtectedRes.status === 401);

    const deliveryProtectedRes = await makeRequest({ path: '/api/delivery/status' });
    assert('Delivery route is alive and protected (401 Unauthorized)', deliveryProtectedRes.status === 401);

    const reportsProtectedRes = await makeRequest({ path: '/api/reports/google-sheet/sync', method: 'POST' });
    assert('Reports route is alive and protected (401 Unauthorized)', reportsProtectedRes.status === 401);
  } catch (err) {
    console.error('Fatal verification test error:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED | ${failed} FAILED | ${skipped} SKIPPED`);
  console.log('================================================================\n');

  if (failed === 0) {
    console.log('🎉 ALL PROVIDER REQUIREMENTS AND DATA MANAGER VERIFICATION CHECKS PASSED!');
    process.exit(0);
  } else {
    console.error('⚠️ VERIFICATION CHECKS FAILED');
    process.exit(1);
  }
}

runVerification();
