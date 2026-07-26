const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/owner/OwnerEmailCenter.tsx', 'utf8');
c = c.replace(/\\`/g, '`').replace(/\\\$\{/g, '${').replace(/\\\\n/g, '\\n');
fs.writeFileSync('frontend/src/pages/owner/OwnerEmailCenter.tsx', c);
console.log('Fixed OwnerEmailCenter.tsx');
