import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PATTERNS = [
  /nvapi-[a-zA-Z0-9_-]+/,
  /sk-or-[a-zA-Z0-9_-]+/,
  /AIza[a-zA-Z0-9_-]+/,
  /xoxb-[a-zA-Z0-9_-]+/
];

console.log('🔒 Running Secret Scanner...');

try {
  // Get list of staged files
  const stagedFilesStr = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
  const stagedFiles = stagedFilesStr.split('\n').filter(Boolean);

  let hasSecrets = false;

  for (const file of stagedFiles) {
    if (!fs.existsSync(file)) continue;
    
    // Skip large assets or binary files
    if (file.match(/\.(png|jpg|jpeg|gif|webp|mp4|webm|pdf|svg)$/)) continue;

    const content = fs.readFileSync(file, 'utf-8');
    for (const pattern of PATTERNS) {
      if (pattern.test(content)) {
        console.error(`\x1b[31m❌ SECRET DETECTED in ${file}!\x1b[0m`);
        console.error(`   Pattern matched: ${pattern}`);
        hasSecrets = true;
      }
    }
  }

  if (hasSecrets) {
    console.error('\x1b[31m\nCommit blocked! Please remove secrets and use process.env.\x1b[0m');
    process.exit(1);
  }

  console.log('✅ No secrets detected.');
  process.exit(0);

} catch (error) {
  console.error('Scanner failed to run:', error);
  process.exit(1);
}
