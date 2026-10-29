/**
 * Supabase GPS Tracking Health Check
 * Run: node scripts/supabase-health-check.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_ANON_KEY env vars must be set. Set them in your .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('\nðŸ” Supabase GPS Tracking Health Check\n' + '='.repeat(42));

// 1. Table access check
console.log('\n[1] Table access...');
const { data: rows, error: tableError } = await supabase
  .from('delivery_locations')
  .select('*')
  .limit(5);

if (tableError) {
  console.error('   âŒ FAILED:', tableError.message);
  console.error('      â†’ Run supabase_tracking_setup.sql in Supabase SQL Editor');
} else {
  console.log(`   âœ… OK â€” ${rows.length} rows found`);
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
  console.error('   âŒ FAILED:', writeError.message);
} else {
  console.log('   âœ… GPS WRITE SUCCESS');
}

// 3. Read back the written row
console.log('\n[3] Read back written row...');
const { data: written, error: readError } = await supabase
  .from('delivery_locations')
  .select('latitude, longitude, heading, last_updated')
  .eq('delivery_partner_id', testPartnerId)
  .single();

if (readError) {
  console.error('   âŒ FAILED:', readError.message);
} else {
  console.log('   âœ… Row found:');
  console.log(`      Lat: ${written.latitude}, Lng: ${written.longitude}`);
  console.log(`      Heading: ${written.heading}Â°`);
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
      console.log('   âœ… REALTIME EVENT RECEIVED:', payload.eventType);
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

console.log('   Triggered upsert â€” waiting for realtime event...');
await new Promise(r => setTimeout(r, 3500));

if (!realtimeReceived) {
  console.warn('   âš   No realtime event received in 5s.');
  console.warn('      â†’ Ensure: ALTER PUBLICATION supabase_realtime ADD TABLE delivery_locations;');
  console.warn('      â†’ Ensure: Supabase Dashboard â†’ Database â†’ Replication â†’ delivery_locations is checked');
}

// 5. Cleanup test row
const { error: delError } = await supabase
  .from('delivery_locations')
  .delete()
  .eq('delivery_partner_id', testPartnerId);

console.log(`\n[5] Cleanup: ${delError ? 'âŒ ' + delError.message : 'âœ… Test row deleted'}`);

// Summary
console.log('\n' + '='.repeat(42));
console.log('Summary:');
console.log(`  Table access:    ${tableError ? 'âŒ' : 'âœ…'}`);
console.log(`  Write (upsert):  ${writeError ? 'âŒ' : 'âœ…'}`);
console.log(`  Read back:       ${readError ? 'âŒ' : 'âœ…'}`);
console.log(`  Realtime events: ${realtimeReceived ? 'âœ…' : 'âš   Not received (check Replication settings)'}`);
console.log('');

await supabase.removeChannel(channel);
process.exit(0);
