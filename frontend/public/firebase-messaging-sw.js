importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Configuration for Firebase App
// Replace these with actual config from environment or template during build
firebase.initializeApp({
  apiKey: "AIzaSyAqkcY-WQrW3WoZWRrv8oo7MTAI_nVrLw4",
  authDomain: "olive-pizza-08.firebaseapp.com",
  projectId: "olive-pizza-08",
  storageBucket: "olive-pizza-08.firebasestorage.app",
  messagingSenderId: "1017239455106",
  appId: "1:1017239455106:web:ea5dd73d10722020007b9b"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg',
    data: payload.data, // Contains stage and orderId
    actions: []
  };

  // Build actions based on stage
  const stage = payload.data?.stage;
  
  if (stage === 'new_order') {
    notificationOptions.actions = [
      { action: 'accept', title: '✅ Accept' },
      { action: 'reject', title: '❌ Reject' },
      { action: 'dashboard', title: '📊 Dashboard' }
    ];
  } else if (stage === 'kitchen_control') {
    notificationOptions.actions = [
      { action: 'start_cooking', title: '🔥 Start Cooking' },
      { action: 'delay_5', title: '⏱️ Delay 5m' },
      { action: 'dashboard', title: '📊 Dashboard' }
    ];
  } else if (stage === 'assign_delivery') {
    notificationOptions.actions = [
      { action: 'assign', title: '🚚 Assign Partner' },
      { action: 'dashboard', title: '📊 Dashboard' }
    ];
  } else if (stage === 'delivery_assigned') {
    notificationOptions.actions = [
      { action: 'accept', title: '✅ Accept Delivery' },
      { action: 'reject', title: '❌ Reject' }
    ];
  } else if (stage === 'navigate_restaurant') {
    notificationOptions.actions = [
      { action: 'arrived', title: '📍 Arrived' }
    ];
  } else if (stage === 'arrived_restaurant') {
    notificationOptions.actions = [
      { action: 'picked_up', title: '📦 Picked Up' }
    ];
  } else if (stage === 'start_delivery') {
    notificationOptions.actions = [
      { action: 'arrived_customer', title: '📍 Arrived at Customer' }
    ];
  } else if (stage === 'arrived_customer') {
    notificationOptions.actions = [
      { action: 'delivered', title: '✅ Delivered' }
    ];
  }

  // Report Delivered
  if (payload.data?.notificationId) {
    fetch('/api/notifications/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: payload.data.notificationId, stage: 'Delivered' })
    }).catch(console.error);
  }

  // Use collapse_key or a tag to replace existing notifications for this order
  notificationOptions.tag = `order_${payload.data?.orderId || Date.now()}`;

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const action = event.action;
  const data = event.notification.data || {};
  
  // Report Clicked
  if (data.notificationId) {
    event.waitUntil(
      fetch('/api/notifications/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: data.notificationId, stage: 'Clicked' })
      }).catch(console.error)
    );
  }
  
  if (action === 'dashboard' || action === '') {
    // Open the app dashboard
    clients.openWindow(data.url || '/');
    return;
  }

  // Send action to backend
  event.waitUntil(
    fetch('/api/notifications/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: data.orderId,
        currentStage: data.stage,
        action: action
      })
    })
  );
});
