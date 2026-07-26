import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PATTERNS = [
  { name: 'NVIDIA API Key', regex: /nvapi-[a-zA-Z0-9_-]{10,}/ },
  { name: 'OpenRouter API Key', regex: /sk-or-v1-[a-zA-Z0-9_-]{10,}/ },
  { name: 'Slack Bot Token', regex: /xoxb-[a-zA-Z0-9_-]{10,}/ },
  { name: 'PostgreSQL Database Password URI', regex: /postgresql:\/\/[^"'\s]+:[^"'\s]+@/ },
  { name: 'Firebase Service Account Base64 Key', regex: /FIREBASE_SERVICE_ACCOUNT_BASE64\s*=\s*["']?ew[a-zA-Z0-9+/=]{50,}/ },
];

console.log('🔒 Running Project-Wide Secret Scanner...');

try {
  // Get all tracked files in git
  const trackedFilesStr = execSync('git ls-files', { encoding: 'utf-8' });
  const trackedFiles = trackedFilesStr.split('\n').filter(Boolean);

  let hasSecrets = false;

  for (const file of trackedFiles) {
    if (!fs.existsSync(file)) continue;

    // Skip binary, assets, or example files
    if (file.match(/\.(png|jpg|jpeg|gif|webp|mp4|webm|pdf|svg|keystore|jks|jar|class|zip|ico)$/)) continue;
    if (file.endsWith('.env') || file.endsWith('.env.local') || file.endsWith('google-services.json')) continue;

    const content = fs.readFileSync(file, 'utf-8');
    for (const item of PATTERNS) {
      if (item.regex.test(content)) {
        console.error(`\x1b[31m❌ EXPOSED SECRET DETECTED in tracked file: ${file}!\x1b[0m`);
        console.error(`   Secret Type: ${item.name}`);
        hasSecrets = true;
      }
    }
  }

  if (hasSecrets) {
    console.error('\x1b[31m\nScan failed! Remove exposed secrets from tracked code/docs and use process.env.\x1b[0m');
    process.exit(1);
  }

  console.log('✅ Clean! No exposed secrets or credentials found in tracked files.');
  process.exit(0);

} catch (error) {
  console.error('Scanner failed to run:', error);
  process.exit(1);
}
