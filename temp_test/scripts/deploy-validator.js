import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runValidation() {
  console.log('🚀 Running Pre-Deployment Production Validation...\n');
  let hasErrors = false;
  
  const envFiles = ['.env', 'frontend/.env', 'backend/.env'];
  let foundEnv = false;
  for (const file of envFiles) {
    if (fs.existsSync(path.join(__dirname, '..', file))) {
      foundEnv = true;
      break;
    }
  }

  // Verify Build Output
  const distPath = path.join(__dirname, '..', 'dist', 'client');
  if (!fs.existsSync(distPath)) {
    console.error('❌ ERROR: Build directory dist/client not found. Did the build fail?');
    hasErrors = true;
  } else {
    // Verify Critical Assets
    const requiredFiles = ['index.html', '_redirects'];
    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(distPath, file))) {
        console.error(`❌ ERROR: Missing critical build artifact: ${file}`);
        hasErrors = true;
      } else {
        console.log(`✅ Found ${file}`);
      }
    }
  }

  if (hasErrors) {
    console.error('\n❌ Pre-Deployment Validation FAILED. Fix the errors before deploying.');
    process.exit(1);
  } else {
    console.log('\n✅ Pre-Deployment Validation PASSED. Ready for production.');
    process.exit(0);
  }
}

runValidation();
