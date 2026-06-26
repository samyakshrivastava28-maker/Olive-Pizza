// Scripts for firebase and firebase-messaging
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// To implement full FCM later, initialize the app here with your config
// firebase.initializeApp({
//   apiKey: "YOUR_API_KEY",
//   projectId: "YOUR_PROJECT_ID",
//   messagingSenderId: "YOUR_SENDER_ID",
//   appId: "YOUR_APP_ID"
// });

// const messaging = firebase.messaging();

// messaging.onBackgroundMessage(function(payload) {
//   console.log('[firebase-messaging-sw.js] Received background message ', payload);
//   const notificationTitle = payload.notification.title;
//   const notificationOptions = {
//     body: payload.notification.body,
//     icon: '/icons/icon-192x192.webp'
//   };
//
//   self.registration.showNotification(notificationTitle, notificationOptions);
// });

self.addEventListener('install', (event) => {
  console.log('[SW] Push Notification Service Worker Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Push Notification Service Worker Activated');
});

// Mock push listener
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    
    // Example Payload
    // {
    //   title: "Order Update",
    //   body: "Your pizza is out for delivery!",
    //   icon: "/icons/icon-192x192.webp"
    // }
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Olive Pizza', {
        body: data.body || 'You have a new notification',
        icon: data.icon || '/icons/icon-192x192.webp',
        badge: '/icons/icon-192x192.webp',
        data: data.url || '/'
      })
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
