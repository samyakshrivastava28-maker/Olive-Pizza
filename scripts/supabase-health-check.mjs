/**
 * Supabase GPS Tracking Health Check
 * Run: node scripts/supabase-health-check.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tdjrkqmhdynbaciguyvr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkanJrcW1oZHluYmFjaWd1eXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMDE4MzUsImV4cCI6MjA5Nzg3NzgzNX0.03rt77yV0zfnxbLNqbEOWijqpT0iAuEgYqSTGN0HPtI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('\n🔍 Supabase GPS Tracking Health Check\n' + '='.repeat(42));

// 1. Table access check
console.log('\n[1] Table access...');
const { data: rows, error: tableError } = await supabase
  .from('delivery_locations')
  .select('*')
  .limit(5);

if (tableError) {
  console.error('   ❌ FAILED:', tableError.message);
  console.error('      → Run supabase_tracking_setup.sql in Supabase SQL Editor');
} else {
  console.log(`   ✅ OK — ${rows.length} rows found`);
}

// 2. Upsert test (write a test GPS row)
console.log('\n[2] Write (upsert) test...');
const testPartnerId = 'health-check-test-partner';
const { error: writeError } = await supabase
  .from('delivery_locations')
  .upsert({
    delivery_partner_id: testPartnerId,
    latitude: 21.0810244,
    longitude: 81.0123793,
    accuracy: 10,
    speed: 5.5,
    heading: 90,
    online_status: true,
    last_updated: new Date().toISOString(),
  }, { onConflict: 'delivery_partner_id' });

if (writeError) {
  console.error('   ❌ FAILED:', writeError.message);
} else {
  console.log('   ✅ GPS WRITE SUCCESS');
}

// 3. Read back the written row
console.log('\n[3] Read back written row...');
const { data: written, error: readError } = await supabase
  .from('delivery_locations')
  .select('latitude, longitude, heading, last_updated')
  .eq('delivery_partner_id', testPartnerId)
  .single();

if (readError) {
  console.error('   ❌ FAILED:', readError.message);
} else {
  console.log('   ✅ Row found:');
  console.log(`      Lat: ${written.latitude}, Lng: ${written.longitude}`);
  console.log(`      Heading: ${written.heading}°`);
  console.log(`      Last Updated: ${written.last_updated}`);
}

// 4. Realtime channel subscription test (5 second live test)
console.log('\n[4] Realtime channel test (5s)...');
let realtimeReceived = false;

const channel = supabase
  .channel('health-check-channel')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'delivery_locations' },
    (payload) => {
      realtimeReceived = true;
      console.log('   ✅ REALTIME EVENT RECEIVED:', payload.eventType);
      console.log(`      New lat: ${payload.new?.latitude}, lng: ${payload.new?.longitude}`);
    }
  )
  .subscribe((status) => {
    console.log(`   Channel status: ${status}`);
  });

// Trigger a realtime event after 1 second
await new Promise(r => setTimeout(r, 1500));
await supabase
  .from('delivery_locations')
  .upsert({
    delivery_partner_id: testPartnerId,
    latitude: 21.0815,
    longitude: 81.0130,
    heading: 45,
    online_status: true,
    last_updated: new Date().toISOString(),
  }, { onConflict: 'delivery_partner_id' });

console.log('   Triggered upsert — waiting for realtime event...');
await new Promise(r => setTimeout(r, 3500));

if (!realtimeReceived) {
  console.warn('   ⚠  No realtime event received in 5s.');
  console.warn('      → Ensure: ALTER PUBLICATION supabase_realtime ADD TABLE delivery_locations;');
  console.warn('      → Ensure: Supabase Dashboard → Database → Replication → delivery_locations is checked');
}

// 5. Cleanup test row
const { error: delError } = await supabase
  .from('delivery_locations')
  .delete()
  .eq('delivery_partner_id', testPartnerId);

console.log(`\n[5] Cleanup: ${delError ? '❌ ' + delError.message : '✅ Test row deleted'}`);

// Summary
console.log('\n' + '='.repeat(42));
console.log('Summary:');
console.log(`  Table access:    ${tableError ? '❌' : '✅'}`);
console.log(`  Write (upsert):  ${writeError ? '❌' : '✅'}`);
console.log(`  Read back:       ${readError ? '❌' : '✅'}`);
console.log(`  Realtime events: ${realtimeReceived ? '✅' : '⚠  Not received (check Replication settings)'}`);
console.log('');

await supabase.removeChannel(channel);
process.exit(0);
