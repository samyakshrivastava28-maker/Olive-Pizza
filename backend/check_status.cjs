const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.tdjrkqmhdynbaciguyvr:Olivepizz%40rjn@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });
client.connect()
  .then(() => client.query("SELECT status, created_at, target_user_id FROM notification_history ORDER BY created_at DESC LIMIT 5"))
  .then(res => { console.log('History:', JSON.stringify(res.rows, null, 2)); return client.query("SELECT status, created_at, target_user_id FROM notification_queue ORDER BY created_at DESC LIMIT 5"); })
  .then(res => { console.log('Queue:', JSON.stringify(res.rows, null, 2)); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
