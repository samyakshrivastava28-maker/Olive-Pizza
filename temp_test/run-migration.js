import fs from 'fs';
import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

let dbUrl = process.env.DATABASE_URL;
if (dbUrl && dbUrl.includes('.supabase.co')) {
  dbUrl = dbUrl.replace('db.tdjrkqmhdynbaciguyvr.supabase.co:5432', 'aws-1-ap-south-1.pooler.supabase.com:6543');
  if (!dbUrl.includes('pgbouncer=true')) {
    dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'pgbouncer=true';
  }
}

const pgPool = new Pool({
  connectionString: dbUrl,
  connectionTimeoutMillis: 10000,
});

async function runMigration() {
  const sql = fs.readFileSync('backend/notification_migration.sql', 'utf8');
  console.log('Running migration...');
  try {
    const client = await pgPool.connect();
    await client.query(sql);
    client.release();
    console.log('Migration successful.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

runMigration();
