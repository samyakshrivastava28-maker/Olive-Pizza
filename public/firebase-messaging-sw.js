// Scripts for firebase and firebase-messaging
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const params = new URL(location).searchParams;
firebase.initializeApp({
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId")
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Olive Pizza';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new message',
    icon: payload.notification?.image || payload.data?.icon || '/icons/icon-192x192.webp',
    badge: '/icons/icon-192x192.webp',
    data: payload.data?.url || '/'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

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

// Global SW Error Catcher to prevent infinite reload loops
self.addEventListener('error', (event) => {
  console.error('[SW Safe Mode] Caught unhandled worker error:', event.message);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW Safe Mode] Caught unhandled rejection:', event.reason);
});
