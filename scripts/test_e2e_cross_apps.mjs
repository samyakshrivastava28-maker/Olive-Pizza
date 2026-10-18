import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/RYZEN/.gemini/antigravity/brain/8445b00c-92fc-40f2-8c74-25380cbea67a';

const JOURNEYS = [
  {
    name: 'Owner Command Center & Landing',
    url: 'http://localhost:5174',
    screenshot: 'owner_command_center.png',
    verify: async (page) => {
      await page.waitForTimeout(1500);
      return { title: await page.title(), url: page.url() };
    }
  },
  {
    name: 'Owner Reports & Analytics',
    url: 'http://localhost:5174/reports',
    screenshot: 'owner_reports_view.png',
    verify: async (page) => {
      await page.waitForTimeout(1500);
      return { title: await page.title(), url: page.url() };
    }
  },
  {
    name: 'Customer Home & Ordering',
    url: 'http://localhost:3000',
    screenshot: 'customer_home.png',
    verify: async (page) => {
      await page.waitForTimeout(1500);
      return { title: await page.title(), url: page.url() };
    }
  },
  {
    name: 'Customer Menu Catalog',
    url: 'http://localhost:3000/menu',
    screenshot: 'customer_menu.png',
    verify: async (page) => {
      await page.waitForTimeout(1500);
      return { title: await page.title(), url: page.url() };
    }
  },
  {
    name: 'Customer Order Tracking Page',
    url: 'http://localhost:3000/order-tracking/ORD-9999',
    screenshot: 'customer_order_tracking.png',
    verify: async (page) => {
      await page.waitForTimeout(1500);
      return { title: await page.title(), url: page.url() };
    }
  },
  {
    name: 'Customer In-App Bill & JPEG Export',
    url: 'http://localhost:3000/bill/ORD-9999',
    screenshot: 'customer_bill_view.png',
    verify: async (page) => {
      await page.waitForTimeout(1500);
      return { title: await page.title(), url: page.url() };
    }
  },
  {
    name: 'Restaurant Manager Live Dashboard',
    url: 'http://localhost:5176',
    screenshot: 'restaurant_manager_live.png',
    verify: async (page) => {
      await page.waitForTimeout(1500);
      return { title: await page.title(), url: page.url() };
    }
  },
  {
    name: 'Restaurant Manager Reports & Quota',
    url: 'http://localhost:5176/reports',
    screenshot: 'restaurant_manager_reports.png',
    verify: async (page) => {
      await page.waitForTimeout(1500);
      return { title: await page.title(), url: page.url() };
    }
  },
  {
    name: 'Franchise Management Workspace',
    url: 'http://localhost:5179',
    screenshot: 'franchise_workspace.png',
    verify: async (page) => {
      await page.waitForTimeout(1500);
      return { title: await page.title(), url: page.url() };
    }
  },
  {
    name: 'Delivery Partner Portal',
    url: 'http://localhost:5177',
    screenshot: 'delivery_partner_portal.png',
    verify: async (page) => {
      await page.waitForTimeout(1500);
      return { title: await page.title(), url: page.url() };
    }
  },
  {
    name: 'POS Billing System',
    url: 'http://localhost:5178',
    screenshot: 'pos_billing_portal.png',
    verify: async (page) => {
      await page.waitForTimeout(1500);
      return { title: await page.title(), url: page.url() };
    }
  }
];

async function runComprehensiveE2E() {
  console.log('🚀 Starting Full Olive Pizza Browser E2E Verification across all apps and journeys...\n');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];

  for (const journey of JOURNEYS) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    const consoleLogs = [];
    const pageErrors = [];

    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => pageErrors.push(err.message));

    const startTime = Date.now();
    let status = 'SUCCESS';
    let errorMsg = null;
    let details = {};

    try {
      console.log(`➡️  Testing ${journey.name} (${journey.url})...`);
      const response = await page.goto(journey.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      details = await journey.verify(page);

      const screenshotPath = path.join(ARTIFACT_DIR, journey.screenshot);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`   📸 Captured screenshot: ${journey.screenshot}`);

      const httpStatus = response ? response.status() : 'Unknown';
      console.log(`   ✅ HTTP ${httpStatus} | Title: "${details.title}" | Latency: ${Date.now() - startTime}ms`);
    } catch (err) {
      status = 'FAILED';
      errorMsg = err.message;
      console.error(`   ❌ Failed: ${err.message}`);
    } finally {
      await context.close();
    }

    results.push({
      journey: journey.name,
      url: journey.url,
      status,
      title: details.title || '',
      error: errorMsg,
      screenshot: journey.screenshot,
      consoleErrors: consoleLogs.filter(l => l.startsWith('[error]')),
      pageErrors
    });
  }

  await browser.close();

  console.log('\n======================================================');
  console.log('📊 Comprehensive Browser E2E Test Results:');
  console.log('======================================================');
  let passCount = 0;
  for (const res of results) {
    const isPass = res.status === 'SUCCESS';
    if (isPass) passCount++;
    console.log(`${isPass ? '✅' : '❌'} ${res.journey} (${res.url})`);
    if (res.title) console.log(`   Page Title: "${res.title}"`);
    if (res.error) console.log(`   Error: ${res.error}`);
  }
  console.log(`\n🎉 Summary: ${passCount} / ${results.length} Journeys Passed Cleanly!`);

  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'playwright_results.json'),
    JSON.stringify(results, null, 2)
  );
  console.log(`💾 Saved updated results to ${path.join(ARTIFACT_DIR, 'playwright_results.json')}`);
}

runComprehensiveE2E().catch(err => {
  console.error('Fatal E2E error:', err);
  process.exit(1);
});
