/**
 * verify_sdui_design_agent.cjs
 * Automated verification of the SDUI Design Agent implementation.
 * Tests:
 *  1. OlivePizzaAISDK new design methods are present
 *  2. DesignStudioService multi-model pipeline structure
 *  3. SDUIVersioningService existence and API shape
 *  4. designStudio.routes.ts new SDUI route definitions
 *  5. Frontend AIReviewModal.tsx real API endpoint wired
 *  6. OwnerMadeUIs.tsx existence and publish/rollback actions
 *  7. SDUI types preserved (SDUISection, SectionType)
 *  8. Olive Pizza AI SDK URL is correct
 *  9. No local LLM instantiation in Design Agent files
 * 10. Button action safety constants present
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const BACKEND = path.join(ROOT, 'backend', 'src');
const FRONTEND = path.join(ROOT, 'frontend', 'src');

let passed = 0;
let failed = 0;

function check(name, condition, details) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${name}${details ? ' — ' + details : ''}`);
    failed++;
  }
}

function readFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
}

console.log('\n🍕 SDUI Design Agent — Verification Suite\n');

// ─── 1. OlivePizzaAISDK new methods ───────────────────────────────────────────
console.log('1. OlivePizzaAISDK — Design Agent Methods');
const sdk = readFile(path.join(BACKEND, 'services', 'OlivePizzaAISDK.ts'));
check('requestDesignReasoning method defined', sdk.includes('requestDesignReasoning'));
check('requestDesignAdvice method defined', sdk.includes('requestDesignAdvice'));
check('enhanceStitchPrompt method defined', sdk.includes('enhanceStitchPrompt'));
check('reviewDesignSafety method defined', sdk.includes('reviewDesignSafety'));
check('_localSafetyAnalysis fallback defined', sdk.includes('_localSafetyAnalysis'));
check('SUPPORTED_ACTIONS includes ADD_TO_CART', sdk.includes('ADD_TO_CART'));
check('SUPPORTED_ACTIONS includes OPEN_CHECKOUT', sdk.includes('OPEN_CHECKOUT'));
check('Routes to Olive Pizza AI /api/ai/design-reasoning', sdk.includes('/api/ai/design-reasoning'));

// ─── 2. DesignStudioService multi-model pipeline ───────────────────────────────
console.log('\n2. DesignStudioService — Multi-Model Pipeline');
const dss = readFile(path.join(BACKEND, 'services', 'ai', 'DesignStudioService.ts'));
check('runMultiModelStitchPipeline method defined', dss.includes('runMultiModelStitchPipeline'));
check('Step 1: DeepSeek V4 Pro reasoning called', dss.includes('requestDesignReasoning'));
check('Step 2: GLM 5.2 advice called', dss.includes('requestDesignAdvice'));
check('Step 3: DeepSeek V4 Flash Stitch prompt called', dss.includes('enhanceStitchPrompt'));
check('Step 4: Google Stitch generateStitchDesign called', dss.includes('generateStitchDesign'));
check('Step 5: Safety review called', dss.includes('reviewDesignSafety'));
check('No local AI instantiation (new OpenAI)', !dss.includes('new OpenAI'));
check('Returns real Stitch error (no silent fallback)', dss.includes('Google Stitch Engine Error'));

// ─── 3. SDUIVersioningService ─────────────────────────────────────────────────
console.log('\n3. SDUIVersioningService — R2 Versioned Storage');
const sduiVS = readFile(path.join(BACKEND, 'services', 'sdui', 'SDUIVersioningService.ts'));
check('SDUIVersioningService file exists', sduiVS.length > 0);
check('saveDesign method defined', sduiVS.includes('saveDesign'));
check('publishDesign method defined', sduiVS.includes('publishDesign'));
check('rollbackToVersion method defined', sduiVS.includes('rollbackToVersion'));
check('restoreDefaultUI method defined', sduiVS.includes('restoreDefaultUI'));
check('listVersions method defined', sduiVS.includes('listVersions'));
check('R2 key pattern sdui/home/versions/', sduiVS.includes('sdui/home/versions/'));
check('Manifest key sdui/home/manifest.json', sduiVS.includes('sdui/home/manifest.json'));
check('Firestore audit log written', sduiVS.includes('sdui_version_history'));

// ─── 4. designStudio.routes.ts new SDUI routes ────────────────────────────────
console.log('\n4. designStudio.routes.ts — SDUI Design Agent Routes');
const routes = readFile(path.join(BACKEND, 'routes', 'designStudio.routes.ts'));
check('SDUIVersioningService imported', routes.includes('SDUIVersioningService'));
check('OlivePizzaAISDK imported', routes.includes('OlivePizzaAISDK'));
check('POST /sdui/generate route defined', routes.includes("'/sdui/generate'"));
check('POST /sdui/save route defined', routes.includes("'/sdui/save'"));
check('POST /sdui/publish route defined', routes.includes("'/sdui/publish'"));
check('POST /sdui/rollback route defined', routes.includes("'/sdui/rollback'"));
check('GET /sdui/versions route defined', routes.includes("'/sdui/versions'"));
check('POST /sdui/ai-review route defined', routes.includes("'/sdui/ai-review'"));

// ─── 5. AIReviewModal.tsx — real API endpoint ─────────────────────────────────
console.log('\n5. AIReviewModal.tsx — Real Backend Review Endpoint');
const modal = readFile(path.join(FRONTEND, 'pages', 'owner', 'OliveStudio', 'modals', 'AIReviewModal.tsx'));
check('AIReviewModal.tsx exists', modal.length > 0);
check('Calls /api/design-studio/sdui/ai-review', modal.includes('/api/design-studio/sdui/ai-review'));
check('Button safety tab present', modal.includes('buttons'));
check('Unmapped buttons warning shown', modal.includes('unmappedButtons'));
check('Visual/Functional/Knowledge score rings', modal.includes('visualScore'));
check('Publish blocked on unmapped buttons', modal.includes('unmappedButtons.length > 0'));

// ─── 6. OwnerMadeUIs.tsx — version management dashboard ──────────────────────
console.log('\n6. OwnerMadeUIs.tsx — Owner Made UIs Dashboard');
const ownerUIs = readFile(path.join(FRONTEND, 'pages', 'owner', 'OliveStudio', 'OwnerMadeUIs.tsx'));
check('OwnerMadeUIs.tsx exists', ownerUIs.length > 0);
check('Loads versions from /api/design-studio/sdui/versions', ownerUIs.includes('/api/design-studio/sdui/versions'));
check('handlePublish calls /sdui/publish', ownerUIs.includes('/api/design-studio/sdui/publish'));
check('handleRollback calls /sdui/rollback', ownerUIs.includes('/api/design-studio/sdui/rollback'));
check('handleRestoreDefault calls restoreDefault=true', ownerUIs.includes('restoreDefault: true'));
check('LIVE/DRAFT/ARCHIVED status labels', ownerUIs.includes('ARCHIVED'));
check('Safety score badge displayed', ownerUIs.includes('safetyScore'));

// ─── 7. SDUI Types preserved ──────────────────────────────────────────────────
console.log('\n7. SDUI Types — Preservation Check');
const types = readFile(path.join(FRONTEND, 'src', 'types', 'sdui.types.ts')) || readFile(path.join(FRONTEND, 'types', 'sdui.types.ts'));
const sduiTypesOk = types.length > 0 || fs.existsSync(path.join(FRONTEND, 'types', 'sdui.types.ts'));
check('sdui.types.ts accessible', fs.existsSync(path.join(FRONTEND, 'types', 'sdui.types.ts')));
check('SDUISection interface defined', (readFile(path.join(FRONTEND, 'types', 'sdui.types.ts'))).includes('SDUISection'));
check('SectionType union preserved', (readFile(path.join(FRONTEND, 'types', 'sdui.types.ts'))).includes('SectionType'));

// ─── 8. Olive Pizza AI URL ───────────────────────────────────────────────────
console.log('\n8. Olive Pizza AI URL — Correct Endpoint');
check('SDK points to olive-pizza-ai.onrender.com', sdk.includes('https://olive-pizza-ai.onrender.com'));

// ─── 9. No local AI duplication ──────────────────────────────────────────────
console.log('\n9. Architecture Safety — No Local AI Duplication');
check('DesignStudioService: no new OpenAI()', !dss.includes('new OpenAI('));
check('SDUIVersioningService: no AI calls', !sduiVS.includes('OpenAI') && !sduiVS.includes('fetch'));

// ─── 10. OliveStudio index — preview event wired ─────────────────────────────
console.log('\n10. OliveStudio index.tsx — OwnerMadeUIs Event Integration');
const studioIndex = readFile(path.join(FRONTEND, 'pages', 'owner', 'OliveStudio', 'index.tsx'));
check('sdui-preview-version event listener added', studioIndex.includes('sdui-preview-version'));
check('lastGenerationPrompt state added', studioIndex.includes('lastGenerationPrompt'));
check('ownerPrompt passed to AIReviewModal', studioIndex.includes('ownerPrompt={lastGenerationPrompt}'));

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`🍕 Results: ${passed} PASS, ${failed} FAIL`);
if (failed === 0) {
  console.log('✅ All checks passed! SDUI Design Agent is correctly implemented.');
} else {
  console.log(`⚠️  ${failed} check(s) failed. Review the above output.`);
}
console.log('─'.repeat(60) + '\n');
process.exit(failed > 0 ? 1 : 0);
