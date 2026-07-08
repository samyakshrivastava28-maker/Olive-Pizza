const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.tdjrkqmhdynbaciguyvr:Olivepizz%40rjn@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });
client.connect()
  .then(() => client.query("SELECT id FROM users WHERE firebase_uid = '6tLLR6q7aTYqzTG2blRx3TU5sA42'"))
  .then(res => {
    const pgId = res.rows[0].id;
    const payload = {
      notification: { title: 'Backend Direct Test', body: 'This was enqueued directly via SQL!' },
      data: { url: '/', category: 'system' }
    };
    return client.query(
      `INSERT INTO notification_queue (target_user_id, payload, priority, category)
       VALUES ($1, $2, 'high', 'system') RETURNING id`,
      [pgId, JSON.stringify(payload)]
    );
  })
  .then(res => { console.log('Enqueued ID:', res.rows[0].id); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
