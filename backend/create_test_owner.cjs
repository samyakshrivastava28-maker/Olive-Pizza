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
  const email = 'testowner' + Date.now() + '@example.com';
  const password = 'Password123!';
  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName: 'Test Owner'
  });
  console.log('Firebase User Created:', userRecord.uid);
  
  const client = await pgPool.connect();
  try {
    await client.query(
      `INSERT INTO users (firebase_uid, email, role, name, onboarding_completed)
       VALUES ($1, $2, 'owner', 'Test Owner', TRUE)`,
      [userRecord.uid, email]
    );
    console.log('Postgres User Created. Email:', email, 'Password:', password);
  } finally {
    client.release();
  }
  process.exit(0);
}
run().catch(console.error);
