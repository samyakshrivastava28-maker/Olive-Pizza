/**
 * Master E2E Test Runner for Olive Pizza Multi-Repository Platform
 * Executes all 4 tiers (341 test cases):
 *   - Tier 1: Feature Coverage (155 tests)
 *   - Tier 2: Boundary & Corner Cases (155 tests)
 *   - Tier 3: Cross-Feature Combinations (21 tests)
 *   - Tier 4: Real-World Application Scenarios (10 tests)
 * Emits canonical `test-results/e2e-report.json` and prints summary console output.
 */

import fs from 'fs';
import path from 'path';
import type { E2EReport, TestCaseResult, TierSummary } from './config/testTypes.js';
import { runTier1FeatureCoverage } from './suites/01_tier1_feature_coverage.spec.js';
import { runTier2BoundaryCorner } from './suites/02_tier2_boundary_corner.spec.js';
import { runTier3CrossFeature } from './suites/03_tier3_cross_feature.spec.js';
import { runTier4RealWorld } from './suites/04_tier4_real_world.spec.js';
import { browserManager } from './helpers/browserContexts.js';

async function main() {
  console.log('================================================================================');
  console.log('🍕 OLIVE PIZZA — 4-TIER REQUIREMENT-DRIVEN E2E TEST SUITE RUNNER');
  console.log('   Adheres strictly to ORIGINAL_REQUEST.md (R1-R6) & TEST_INFRA.md');
  console.log('================================================================================\n');

  const suiteStartTime = Date.now();
  const allResults: TestCaseResult[] = [];

  // Tier 1 Execution
  console.log('▶ [TIER 1] Running Feature Coverage Tests (155 Test Cases, 5 per Feature)...');
  const t1Results = await runTier1FeatureCoverage();
  allResults.push(...t1Results);
  const t1Passed = t1Results.filter((t) => t.status === 'PASS').length;
  const t1NotTested = t1Results.filter((t) => t.status === 'NOT_TESTED').length;
  const t1Failed = t1Results.filter((t) => t.status === 'FAIL').length;
  console.log(`   ✔ Tier 1 Completed: ${t1Passed} Passed, ${t1NotTested} Not Tested, ${t1Failed} Failed\n`);

  // Tier 2 Execution
  console.log('▶ [TIER 2] Running Boundary & Corner Cases Tests (155 Test Cases, 5 per Feature)...');
  const t2Results = await runTier2BoundaryCorner();
  allResults.push(...t2Results);
  const t2Passed = t2Results.filter((t) => t.status === 'PASS').length;
  const t2NotTested = t2Results.filter((t) => t.status === 'NOT_TESTED').length;
  const t2Failed = t2Results.filter((t) => t.status === 'FAIL').length;
  console.log(`   ✔ Tier 2 Completed: ${t2Passed} Passed, ${t2NotTested} Not Tested, ${t2Failed} Failed\n`);

  // Tier 3 Execution
  console.log('▶ [TIER 3] Running Cross-Feature Pairwise Combinations (21 Test Cases)...');
  const t3Results = await runTier3CrossFeature();
  allResults.push(...t3Results);
  const t3Passed = t3Results.filter((t) => t.status === 'PASS').length;
  const t3NotTested = t3Results.filter((t) => t.status === 'NOT_TESTED').length;
  const t3Failed = t3Results.filter((t) => t.status === 'FAIL').length;
  console.log(`   ✔ Tier 3 Completed: ${t3Passed} Passed, ${t3NotTested} Not Tested, ${t3Failed} Failed\n`);

  // Tier 4 Execution
  console.log('▶ [TIER 4] Running Real-World Application Scenarios (10 Full Journeys)...');
  const t4Results = await runTier4RealWorld();
  allResults.push(...t4Results);
  const t4Passed = t4Results.filter((t) => t.status === 'PASS').length;
  const t4NotTested = t4Results.filter((t) => t.status === 'NOT_TESTED').length;
  const t4Failed = t4Results.filter((t) => t.status === 'FAIL').length;
  console.log(`   ✔ Tier 4 Completed: ${t4Passed} Passed, ${t4NotTested} Not Tested, ${t4Failed} Failed\n`);

  // Browser cleanup
  await browserManager.closeAll();

  // Aggregate Metrics
  const durationMs = Date.now() - suiteStartTime;
  const totalPassed = allResults.filter((t) => t.status === 'PASS').length;
  const totalNotTested = allResults.filter((t) => t.status === 'NOT_TESTED').length;
  const totalFailed = allResults.filter((t) => t.status === 'FAIL').length;

  const toTierSummary = (results: TestCaseResult[]): TierSummary => ({
    total: results.length,
    passed: results.filter((t) => t.status === 'PASS').length,
    failed: results.filter((t) => t.status === 'FAIL').length,
    notTested: results.filter((t) => t.status === 'NOT_TESTED').length,
  });

  const classifications = {
    automated: allResults.filter((t) => t.classification === 'AUTOMATED').length,
    localhost_browser: allResults.filter((t) => t.classification === 'LOCALHOST BROWSER').length,
    physical_phone: allResults.filter((t) => t.classification === 'PHYSICAL PHONE').length,
    not_tested: allResults.filter((t) => t.classification === 'NOT TESTED').length,
  };

  const report: E2EReport = {
    project: 'Olive Pizza Multi-Repository Platform',
    timestamp: new Date().toISOString(),
    summary: {
      total: allResults.length,
      passed: totalPassed,
      failed: totalFailed,
      skipped: 0,
      notTested: totalNotTested,
      durationMs,
    },
    tiers: {
      tier1_feature_coverage: toTierSummary(t1Results),
      tier2_boundary_corner: toTierSummary(t2Results),
      tier3_cross_feature: toTierSummary(t3Results),
      tier4_real_world_application: toTierSummary(t4Results),
    },
    classifications,
    testCases: allResults,
  };

  // Ensure test-results directory exists
  const resultsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const reportFilePath = path.join(resultsDir, 'e2e-report.json');
  fs.writeFileSync(reportFilePath, JSON.stringify(report, null, 2), 'utf-8');

  // Print Summary
  console.log('================================================================================');
  console.log('📊 E2E TEST EXECUTION SUMMARY REPORT');
  console.log('================================================================================');
  console.log(`Total Test Inventory : ${allResults.length} / 341 (Target: >=11x31)`);
  console.log(`Passed               : ${totalPassed}`);
  console.log(`Failed               : ${totalFailed}`);
  console.log(`Not Tested (Offline) : ${totalNotTested}`);
  console.log(`Duration             : ${(durationMs / 1000).toFixed(2)}s\n`);

  console.log('Tier Breakdown:');
  console.log(`  - Tier 1 (Feature Coverage)   : ${t1Passed}/${t1Results.length} Passed (${t1NotTested} offline)`);
  console.log(`  - Tier 2 (Boundary & Corner)  : ${t2Passed}/${t2Results.length} Passed (${t2NotTested} offline)`);
  console.log(`  - Tier 3 (Cross-Feature)      : ${t3Passed}/${t3Results.length} Passed (${t3NotTested} offline)`);
  console.log(`  - Tier 4 (Real-World Journeys): ${t4Passed}/${t4Results.length} Passed (${t4NotTested} offline)\n`);

  console.log('Result Classifications (per R6):');
  console.log(`  - [AUTOMATED]        : ${classifications.automated}`);
  console.log(`  - [LOCALHOST BROWSER]: ${classifications.localhost_browser}`);
  console.log(`  - [PHYSICAL PHONE]   : ${classifications.physical_phone}`);
  console.log(`  - [NOT TESTED]       : ${classifications.not_tested}\n`);

  console.log(`📁 Detailed JSON Report saved to:\n   ${reportFilePath}`);
  console.log('================================================================================\n');

  if (totalFailed > 0) {
    console.error(`❌ Suite failed with ${totalFailed} failing test(s).`);
    process.exit(1);
  } else {
    console.log('✅ ALL EXECUTED E2E TESTS PASSED SUCCESSFULLY.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal Runner Error:', err);
  process.exit(1);
});
