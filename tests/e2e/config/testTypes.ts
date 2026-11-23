/**
 * Canonical Test Types and Interfaces for Olive Pizza E2E Test Suite
 * Adheres strictly to TEST_INFRA.md and PROJECT.md
 */

export type TestTier = 1 | 2 | 3 | 4;

export type TestClassification =
  | 'AUTOMATED'
  | 'LOCALHOST BROWSER'
  | 'PHYSICAL PHONE'
  | 'NOT TESTED';

export type TestStatus = 'PASS' | 'FAIL' | 'NOT_TESTED';

export interface TestCaseResult {
  id: string;
  featureId: number;
  tier: TestTier;
  title: string;
  classification: TestClassification;
  status: TestStatus;
  durationMs: number;
  error?: string | null;
  details?: Record<string, any>;
}

export interface TierSummary {
  total: number;
  passed: number;
  failed: number;
  notTested: number;
}

export interface E2EReport {
  project: string;
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    notTested: number;
    durationMs: number;
  };
  tiers: {
    tier1_feature_coverage: TierSummary;
    tier2_boundary_corner: TierSummary;
    tier3_cross_feature: TierSummary;
    tier4_real_world_application: TierSummary;
  };
  classifications: {
    automated: number;
    localhost_browser: number;
    physical_phone: number;
    not_tested: number;
  };
  testCases: TestCaseResult[];
}
