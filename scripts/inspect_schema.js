import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const res = await pool.query(`
      SELECT table_name, column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name IN ('order_locks', 'delivery_locations', 'payments', 'refunds', 'notification_queue', 'email_queue', 'checkout_locks', 'payment_sessions', 'payment_webhooks')
      ORDER BY table_name, ordinal_position;
    `);
    
    const tables = {};
    for (const row of res.rows) {
      if (!tables[row.table_name]) tables[row.table_name] = [];
      tables[row.table_name].push({ column: row.column_name, type: row.data_type, nullable: row.is_nullable });
    }
    console.log(JSON.stringify(tables, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
