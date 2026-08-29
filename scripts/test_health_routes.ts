import express from 'express';
import request from 'supertest';
import healthRouter from '../../olive-pizza-owner/backend/src/routes/health.routes.js';
import { closePostgresPool } from '../../olive-pizza-owner/backend/src/config/postgres.js';

const app = express();
app.use('/', healthRouter);

async function testRoutes() {
  console.log('--- Testing /health ---');
  const healthRes = await request(app).get('/health');
  console.log('Health Status:', healthRes.status, healthRes.body);

  console.log('\n--- Testing /ready ---');
  const readyRes = await request(app).get('/ready');
  console.log('Ready Status:', readyRes.status, JSON.stringify(readyRes.body, null, 2));

  console.log('\n--- Testing /version ---');
  const versionRes = await request(app).get('/version');
  console.log('Version Status:', versionRes.status, versionRes.body);

  await closePostgresPool();
}

testRoutes().catch(console.error);
