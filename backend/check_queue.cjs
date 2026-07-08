const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.tdjrkqmhdynbaciguyvr:Olivepizz%40rjn@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });
client.connect()
  .then(() => client.query("SELECT status FROM notification_queue ORDER BY created_at DESC LIMIT 1"))
  .then(res => { console.log('Queue Status:', res.rows[0]?.status); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
