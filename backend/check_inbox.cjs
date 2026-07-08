const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.tdjrkqmhdynbaciguyvr:Olivepizz%40rjn@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });
client.connect()
  .then(() => client.query("SELECT * FROM notification_inbox WHERE user_id = '2a0bab7e-d458-4299-a6a1-b796bce836f9' ORDER BY created_at DESC LIMIT 5"))
  .then(res => { console.log(JSON.stringify(res.rows, null, 2)); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
