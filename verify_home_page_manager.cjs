const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:3000';
const MOCK_DIR = path.join(__dirname, '.r2_mock');

async function check(name, condition) {
  if (condition) {
    console.log(`✅ PASS: ${name}`);
  } else {
    console.error(`❌ FAIL: ${name}`);
    process.exit(1);
  }
}

async function verify() {
  console.log('🍕 Home Page Manager — Verification Suite\n');
  
  // 1. Check local R2 mock storage exists
  const livePointerPath = path.join(MOCK_DIR, 'home-pages', 'live-pointer.json');
  check('R2 live-pointer.json exists', fs.existsSync(livePointerPath));

  const pointer = JSON.parse(fs.readFileSync(livePointerPath, 'utf8'));
  check('live-pointer contains activePageId', pointer.activePageId !== undefined);
  check('live-pointer contains activeVersionId', pointer.activeVersionId !== undefined);

  // 2. Fetch public endpoint
  console.log(`\nFetching ${BACKEND_URL}/api/homepage/live...`);
  try {
    const res = await fetch(`${BACKEND_URL}/api/homepage/live`);
    if (!res.ok) {
      console.error(`Status: ${res.status}`);
      console.error(`Text: ${await res.text()}`);
    }
    const data = await res.json();
    check('Public live endpoint returns 200 OK', res.ok);
    check('Public live endpoint returns success: true', data.success === true);
    check('Returned config has type BUILT_IN', data.config && data.config.type === 'BUILT_IN');
    check('Returned config matches live-pointer', data.config.pageId === pointer.activePageId && data.config.versionId === pointer.activeVersionId);
    
    console.log('\n✅ All tests passed.');
  } catch (err) {
    console.error('Error hitting backend:', err.message);
    console.error('Is the backend running on port 3001?');
    process.exit(1);
  }
}

verify();
