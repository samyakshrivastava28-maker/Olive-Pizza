import fs from 'fs';

const target = 'C:\\Users\\RYZEN\\Downloads\\olive-pizza-owner\\backend\\src\\app.ts';
let content = fs.readFileSync(target, 'utf8');

// Replace health route mounts to mount healthRoutes first and cleanly
content = content.replace(
  `import healthRoutes from './routes/health.routes.js';
import healthStreamRoutes from './routes/health.stream.routes.js';

// Exclude health streams from rate limiters
app.use('/health', healthStreamRoutes);
app.use('/health', healthRoutes);`,
  `import healthRoutes from './routes/health.routes.js';
import healthStreamRoutes from './routes/health.stream.routes.js';

// Direct core health & readiness probes
app.use('/', healthRoutes);
app.use('/api', healthRoutes);
app.use('/health', healthStreamRoutes);`
);

fs.writeFileSync(target, content, 'utf8');
console.log('✅ Updated health route mounts in app.ts');
