const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.tdjrkqmhdynbaciguyvr:Olivepizz%40rjn@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });
client.connect()
  .then(() => client.query("INSERT INTO users (firebase_uid, email, role, name, onboarding_completed) VALUES ('6tLLR6q7aTYqzTG2blRx3TU5sA42', 'webhub2811@gmail.com', 'owner', 'Web Hub', TRUE) ON CONFLICT (firebase_uid) DO UPDATE SET role = 'owner'"))
  .then(res => { console.log('User synced'); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
