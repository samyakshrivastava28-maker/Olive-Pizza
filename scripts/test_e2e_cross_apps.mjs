import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/RYZEN/.gemini/antigravity/brain/8445b00c-92fc-40f2-8c74-25380cbea67a';

const APPS = [
  { name: 'Owner Dashboard', url: 'http://localhost:5174', screenshot: 'owner_dashboard.png' },
  { name: 'Customer App', url: 'http://localhost:3000', screenshot: 'customer_app.png' },
  { name: 'Restaurant Manager', url: 'http://localhost:5176', screenshot: 'restaurant_manager.png' },
  { name: 'Franchise Management', url: 'http://localhost:5179', screenshot: 'franchise_management.png' },
  { name: 'Delivery Partner', url: 'http://localhost:5177', screenshot: 'delivery_partner.png' },
  { name: 'POS Billing Preview', url: 'http://localhost:5178', screenshot: 'pos_billing.png' }
];

async function runE2EVerification() {
  console.log('🚀 Starting Olive Pizza Cross-App Playwright Verification...\n');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];

  for (const app of APPS) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const consoleLogs = [];
    const pageErrors = [];

    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => pageErrors.push(err.message));

    const startTime = Date.now();
    let status = 'SUCCESS';
    let errorMsg = null;
    let pageTitle = '';

    try {
      console.log(`➡️  Testing ${app.name} (${app.url})...`);
      const response = await page.goto(app.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000); // Allow React hydration
      pageTitle = await page.title();

      const screenshotPath = path.join(ARTIFACT_DIR, app.screenshot);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`   📸 Captured screenshot: ${app.screenshot}`);

      const httpStatus = response ? response.status() : 'Unknown';
      console.log(`   ✅ HTTP Status: ${httpStatus} | Title: "${pageTitle}" | Latency: ${Date.now() - startTime}ms`);
    } catch (err) {
      status = 'FAILED';
      errorMsg = err.message;
      console.error(`   ❌ Failed: ${err.message}`);
    } finally {
      await context.close();
    }

    results.push({
      app: app.name,
      url: app.url,
      status,
      title: pageTitle,
      error: errorMsg,
      screenshot: app.screenshot,
      consoleErrors: consoleLogs.filter(l => l.startsWith('[error]')),
      pageErrors
    });
  }

  await browser.close();

  console.log('\n========================================');
  console.log('📊 Playwright Cross-App Verification Summary:');
  console.log('========================================');
  for (const res of results) {
    console.log(`${res.status === 'SUCCESS' ? '✅' : '❌'} ${res.app} (${res.url}): ${res.status}`);
    if (res.title) console.log(`   Title: ${res.title}`);
    if (res.consoleErrors.length > 0) {
      console.log(`   Console Errors (${res.consoleErrors.length}):`, res.consoleErrors.slice(0, 3));
    }
    if (res.pageErrors.length > 0) {
      console.log(`   Page Errors (${res.pageErrors.length}):`, res.pageErrors.slice(0, 3));
    }
    if (res.error) console.log(`   Failure: ${res.error}`);
  }

  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'playwright_results.json'),
    JSON.stringify(results, null, 2)
  );
  console.log(`\n💾 Saved detailed results to ${path.join(ARTIFACT_DIR, 'playwright_results.json')}`);
}

runE2EVerification().catch(err => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
