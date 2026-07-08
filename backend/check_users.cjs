require('dotenv').config({path: '../.env'});
const admin = require('firebase-admin');
const { Pool } = require('pg');

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')))
});

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const snap = await admin.firestore().collection('users').get();
  console.log('Firestore users count:', snap.size);
  snap.forEach(doc => console.log('Firestore user:', doc.id, doc.data().role));
  
  const client = await pgPool.connect();
  const pgUsers = await client.query('SELECT firebase_uid, email, role FROM users');
  console.log('Postgres users count:', pgUsers.rows.length);
  pgUsers.rows.forEach(r => console.log('PG user:', r.firebase_uid, r.role));
  client.release();
  
  process.exit(0);
}
run().catch(console.error);
