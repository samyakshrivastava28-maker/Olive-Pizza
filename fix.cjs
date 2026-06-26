const fs = require('fs');
let c = fs.readFileSync('backend/src/routes/email.routes.ts', 'utf8');
c = c.replace(/\\`/g, '`').replace(/\\\$\{/g, '${');
fs.writeFileSync('backend/src/routes/email.routes.ts', c);
console.log('Fixed email.routes.ts');
