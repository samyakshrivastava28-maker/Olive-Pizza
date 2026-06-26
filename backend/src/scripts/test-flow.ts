import pool from '../lib/db.js';

async function testFlow() {
  const firebase_uid = 'test_flow_uid_123';
  const email = 'testflow@example.com';
  const name = 'Flow Tester';
  const phone = '9876543210';
  const addressLine = '123 Test St';
  const city = 'Test City';
  const state = 'Test State';
  const lat = 21.123;
  const lng = 81.123;

  try {
    console.log('--- 1. Testing /sync ---');
    const syncSql = `
      INSERT INTO users (firebase_uid, email, name, role)
      VALUES ($1, $2, $3, 'customer')
      ON CONFLICT (firebase_uid) DO UPDATE 
      SET name = COALESCE(EXCLUDED.name, users.name)
      RETURNING *;
    `;
    const syncRes = await pool.query(syncSql, [firebase_uid, email, name]);
    console.log('Sync Success! User:', syncRes.rows[0].email);

    console.log('--- 2. Testing /phone ---');
    const phoneSql = `
      INSERT INTO users (firebase_uid, email, name, phone, phone_setup_completed, role)
      VALUES ($2, $3, 'Customer', $1, true, 'customer')
      ON CONFLICT (firebase_uid) DO UPDATE 
      SET phone = EXCLUDED.phone, phone_setup_completed = true
      RETURNING *;
    `;
    const phoneRes = await pool.query(phoneSql, [phone, firebase_uid, email]);
    console.log('Phone Success! Phone:', phoneRes.rows[0].phone);

    console.log('--- 3. Testing /location ---');
    const locationSql = `
      INSERT INTO users (firebase_uid, email, name, location_setup_completed, role, full_address, city, state, lat, lng)
      VALUES ($1, $2, 'Customer', true, 'customer', $3, $4, $5, $6, $7)
      ON CONFLICT (firebase_uid) DO UPDATE 
      SET location_setup_completed = true,
          full_address = EXCLUDED.full_address,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          lat = EXCLUDED.lat,
          lng = EXCLUDED.lng
      RETURNING *;
    `;
    const locationRes = await pool.query(locationSql, [firebase_uid, email, addressLine, city, state, lat, lng]);
    console.log('Location Success! Address:', locationRes.rows[0].full_address);

    console.log('✅ ALL TESTS PASSED SUCCESSFULLY!');

    // Cleanup test user
    await pool.query('DELETE FROM users WHERE firebase_uid = $1', [firebase_uid]);
    console.log('Test user cleaned up.');

  } catch (err) {
    console.error('🔥 TEST FAILED:', err);
  } finally {
    await pool.end();
  }
}

testFlow();
