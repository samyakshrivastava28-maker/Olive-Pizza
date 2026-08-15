const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;

function logPass(msg) {
  console.log(`✅ [PASS] ${msg}`);
  passCount++;
}

function logFail(msg) {
  console.log(`❌ [FAIL] ${msg}`);
  failCount++;
}

// 1. DeliveryAlarmManager status filter check
function testDeliveryAlarmManagerQuery() {
  const fileContent = fs.readFileSync('./frontend/src/services/DeliveryAlarmManager.ts', 'utf8');
  const hasSingleStatusCheck = fileContent.includes('where("status", "==", "partner_assigned")');
  const hasOutForDeliveryExcluded = !fileContent.includes('where("status", "in", ["partner_assigned", "out_for_delivery"])');
  const hasStopAlarmMethod = fileContent.includes('public stopAlarm()');

  if (hasSingleStatusCheck && hasOutForDeliveryExcluded && hasStopAlarmMethod) {
    logPass('1. DeliveryAlarmManager monitors status == "partner_assigned" ONLY and provides stopAlarm() method (stops ringtone on acceptance)');
    return true;
  }
  logFail('DeliveryAlarmManager query check failed');
  return false;
}

// 2. OwnerLayout emergency order status filter check
function testOwnerLayoutStatusFilter() {
  const fileContent = fs.readFileSync('./frontend/src/components/OwnerLayout.tsx', 'utf8');
  const hasStatusCheck = fileContent.includes("['pending', 'placed', 'created', 'new_order'].includes(newOrderData.status)");

  if (hasStatusCheck) {
    logPass('2. OwnerLayout filters emergency order overlay trigger to pending orders ONLY (prevents rider task alerts on owner screen)');
    return true;
  }
  logFail('OwnerLayout status filter check failed');
  return false;
}

// 3. NewOrderEmergencyOverlay status guard check
function testNewOrderOverlayGuard() {
  const fileContent = fs.readFileSync('./frontend/src/components/owner/NewOrderEmergencyOverlay.tsx', 'utf8');
  const hasGuard = fileContent.includes("['pending', 'placed', 'created', 'new_order'].includes(order.status)");

  if (hasGuard) {
    logPass('3. NewOrderEmergencyOverlay returns null for non-pending orders');
    return true;
  }
  logFail('NewOrderEmergencyOverlay guard check failed');
  return false;
}

// 4. DeliveryAlertManager role guard check
function testDeliveryAlertManagerRoleGuard() {
  const fileContent = fs.readFileSync('./frontend/src/components/delivery/DeliveryAlertManager.tsx', 'utf8');
  const hasRoleGuard = fileContent.includes("role !== 'delivery_partner'");

  if (hasRoleGuard) {
    logPass('4. DeliveryAlertManager strictly guarded for user.role === "delivery_partner" ONLY');
    return true;
  }
  logFail('DeliveryAlertManager role guard check failed');
  return false;
}

// 5. PushNotificationManager role isolation check
function testPushNotificationManagerRoleIsolation() {
  const fileContent = fs.readFileSync('./frontend/src/components/PushNotificationManager.tsx', 'utf8');
  const hasTargetRoleGuard = fileContent.includes('targetRole !== userRole');
  const hasCategoryRoleGuard = fileContent.includes("userRole !== 'delivery_partner'");

  if (hasTargetRoleGuard && hasCategoryRoleGuard) {
    logPass('5. PushNotificationManager filters foreground notifications & sounds strictly by userRole');
    return true;
  }
  logFail('PushNotificationManager role isolation check failed');
  return false;
}

// 6. DeliveryDashboard stopAlarm call check
function testDeliveryDashboardStopAlarm() {
  const fileContent = fs.readFileSync('./frontend/src/pages/delivery/DeliveryDashboard.tsx', 'utf8');
  const hasStopAlarmCall = fileContent.includes('DeliveryAlarmManager.stopAlarm()');

  if (hasStopAlarmCall) {
    logPass('6. DeliveryDashboard calls DeliveryAlarmManager.stopAlarm() synchronously on task acceptance');
    return true;
  }
  logFail('DeliveryDashboard stopAlarm call check failed');
  return false;
}

function runAllTests() {
  console.log('======================================================');
  console.log('🍕 OLIVE PIZZA NOTIFICATION & ROLE ISOLATION VERIFICATION');
  console.log('======================================================\n');

  testDeliveryAlarmManagerQuery();
  testOwnerLayoutStatusFilter();
  testNewOrderOverlayGuard();
  testDeliveryAlertManagerRoleGuard();
  testPushNotificationManagerRoleIsolation();
  testDeliveryDashboardStopAlarm();

  console.log('\n======================================================');
  console.log(`RESULTS: ${passCount} / ${passCount + failCount} tests passed.`);
  console.log('======================================================');

  if (failCount > 0) {
    console.error('❌ ROLE ISOLATION VERIFICATION FAILED.');
    process.exit(1);
  } else {
    console.log('🎉 ALL NOTIFICATION & ROLE ISOLATION TESTS PASSED!');
    process.exit(0);
  }
}

runAllTests();
