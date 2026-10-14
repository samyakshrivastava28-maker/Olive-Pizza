/**
 * Olive Pizza — Enterprise Firebase Messaging Service Worker
 *
 * Features:
 * - Live Order Cards: FCM tag-based in-place notification updates (no duplicate cards)
 * - Quick Actions: Direct API calls from notification buttons without opening the app
 * - Offline Action Queue: Actions queued via IndexedDB if offline, synced when reconnected
 * - Multi-tab Sync: BroadcastChannel notifies all open tabs of state changes
 * - Acknowledgement: Reports delivered/opened/action events back to the server
 * - Custom Sounds: Per-category audio via a hidden <audio> element in open windows
 * - Auto Recovery: On SW restart, re-registers Background Sync tasks
 */

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAqkcY-WQrW3WoZWRrv8oo7MTAI_nVrLw4",
  authDomain: "olive-pizza-08.firebaseapp.com",
  projectId: "olive-pizza-08",
  storageBucket: "olive-pizza-08.firebasestorage.app",
  messagingSenderId: "1017239455106",
  appId: "1:1017239455106:web:ea5dd73d10722020007b9b"
});

const messaging = firebase.messaging();

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = self.location.origin + '/api';  // adjust if backend is on separate domain
const BROADCAST = new BroadcastChannel('olive_pizza_notifications');
const OFFLINE_QUEUE_KEY = 'olive_offline_action_queue';
const ICON = 'https://res.cloudinary.com/dxmlvkff1/image/upload/v1782376898/olive-pizza/brand/logo.png';
const BADGE = 'https://res.cloudinary.com/dxmlvkff1/image/upload/v1782376898/olive-pizza/brand/badge_mono.png';

// ─── IndexedDB helpers (offline queue) & Safe Mode ─────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open('olive_sw', 3);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('offlineActions')) {
          db.createObjectStore('offlineActions', { keyPath: 'id', autoIncrement: true });
        }
        if (db.objectStoreNames.contains('authTokens')) {
          db.deleteObjectStore('authTokens');
        }
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => {
        console.error('[SW] IndexedDB corrupted, triggering Safe Mode rebuild.', e.target.error);
        indexedDB.deleteDatabase('olive_sw'); // Safe Mode: clear corrupted DB
        reject(e.target.error);
      };
    } catch (err) {
      console.error('[SW] Critical IDB failure in Safe Mode:', err);
      reject(err);
    }
  });
}

// Global SW Error Catcher to prevent infinite reload loops
self.addEventListener('error', (event) => {
  console.error('[SW Safe Mode] Caught unhandled worker error:', event.message);
  // We do NOT unregister the SW here automatically to prevent rapid reload loops.
  // We just let it gracefully degrade.
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW Safe Mode] Caught unhandled rejection:', event.reason);
});

async function saveOfflineAction(action) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offlineActions', 'readwrite');
    tx.objectStore('offlineActions').add({ ...action, createdAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}

async function getAndClearOfflineActions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offlineActions', 'readwrite');
    const store = tx.objectStore('offlineActions');
    const req = store.getAll();
    req.onsuccess = () => {
      const items = req.result;
      store.clear();
      resolve(items);
    };
    req.onerror = e => reject(e.target.error);
  });
}


// ─── Background Message Handler ────────────────────────────────────────────────
messaging.onBackgroundMessage(async (payload) => {
  const data = payload.data || {};
  if (data.action === 'STOP_ALERT') {
    BROADCAST.postMessage({ type: 'STOP_ALERT', orderId: data.orderId });
    return;
  }

  // Customer application must never display operational restaurant new-order alarms
  if (
    data.category === 'owner_orders' ||
    data.category === 'alarm_actionable' ||
    data.category === 'new_order' ||
    data.stage === 'new_order' ||
    data.type === 'NEW_ORDER'
  ) {
    console.log('[SW] Dropped operational restaurant alarm from customer SW');
    return;
  }

  console.log('[SW] Background message:', data.tag || 'no-tag');

  const tag = data.tag || `notification_${Date.now()}`;
  const notifTitle = payload.notification?.title || 'Olive Pizza';
  const notifBody = payload.notification?.body || '';
  const stage = data.stage || '';
  const orderId = data.orderId;
  const queueId = data.queueId;
  const sound = data.sound || 'default';
  const url = data.url || '/';
  const category = data.category || 'general';
  const priority = data.priority || 'normal';

  // ── Acknowledge delivery ─────────────────────────────────────────────────
  if (queueId) {
    fetch(`${API_BASE}/notifications/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queueId, stage: 'delivered', orderId })
    }).catch(() => {});
  }

  // ── Build actions based on stage/role ────────────────────────────────────
  const actions = buildActions(stage, data.role);

  // ── Notification options ─────────────────────────────────────────────────
  const options = {
    body: notifBody,
    icon: ICON,
    badge: BADGE,
    tag,                // Live Card — replaces existing notification with same tag
    renotify: true,     // Re-alert user (sound + vibration) even on update
    requireInteraction: priority === 'critical' || stage === 'new_order' || stage === 'delivery_assigned',
    silent: false,
    vibrate: priority === 'critical' ? [300, 200, 300, 200, 300] : [200, 100, 200],
    actions,
    data: {
      url,
      orderId,
      queueId,
      stage,
      sound,
      category,
      role: data.role,
    },
    // Timestamp so OS can show "X minutes ago"
    timestamp: Date.now(),
  };

  // If it's a continuous alert, broadcast it so open tabs can play sound
  if (data.alert === 'continuous') {
    BROADCAST.postMessage({ type: 'START_ALERT', orderId, sound: data.sound });
  }

  // ── Data-only silent update (GPS/countdown) — update existing notification ─
  if (!payload.notification && payload.data) {
    // Silent background update — update existing notification in-place
    const existingNotifications = await self.registration.getNotifications({ tag });
    if (existingNotifications.length > 0) {
      const existing = existingNotifications[0];
      // Rebuild with fresh ETA/body from data
      const updatedBody = data.updatedBody || existing.body;
      self.registration.showNotification(existing.title, {
        ...options,
        body: updatedBody,
        silent: true,    // No sound for background GPS updates
        renotify: false,
      });
    }
    // Broadcast to open tabs for live map/countdown
    BROADCAST.postMessage({ type: 'GPS_UPDATE', data });
    return;
  }

  await self.registration.showNotification(notifTitle, options);

  // ── Broadcast to all open tabs to update UI ──────────────────────────────
  BROADCAST.postMessage({
    type: 'NEW_NOTIFICATION',
    title: notifTitle,
    body: notifBody,
    tag,
    orderId,
    stage,
    sound,
    category,
    data,
  });
});

// ─── Action Builders ──────────────────────────────────────────────────────────
function buildActions(stage, role) {
  const MAX_ACTIONS = 2; // Web Push spec limits to 2 actions on most browsers

  const actionMap = {
    new_order: [{ action: 'accept', title: '✅ Accept' }, { action: 'stop_alert', title: '🔕 Stop Alert' }],
    accepted: [{ action: 'start_cooking', title: '🔥 Start Cooking' }],
    preparing: [{ action: 'ready', title: '🟢 Mark Ready' }],
    ready: [{ action: 'assign_delivery', title: '🚴 Assign Partner' }],
    delivery_assigned: role === 'delivery'
      ? [{ action: 'accept_delivery', title: '✅ Accept' }, { action: 'stop_alert', title: '🔕 Stop Alert' }]
      : [],
    navigate_restaurant: [{ action: 'arrived_restaurant', title: '📍 Arrived' }],
    arrived_restaurant: [{ action: 'picked_up', title: '📦 Picked Up' }],
    out_for_delivery: [{ action: 'arrived_customer', title: '📍 Arrived' }],
    arrived_customer: [{ action: 'delivered', title: '✅ Delivered' }],
    out_for_delivery_customer: [{ action: 'track', title: '📍 Track' }, { action: 'call_partner', title: '📞 Call' }],
    delivered_customer: [{ action: 'rate', title: '⭐ Rate' }, { action: 'reorder', title: '🔄 Reorder' }],
  };

  return (actionMap[stage] || []).slice(0, MAX_ACTIONS);
}

// ─── Notification Click Handler ───────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  const action = event.action;
  const notifData = event.notification.data || {};
  const { orderId, queueId, url, stage, role } = notifData;

  event.notification.close();

  // Track click
  if (queueId) {
    fetch(`${API_BASE}/notifications/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queueId, stage: 'opened', orderId })
    }).catch(() => {});
  }

  // Determine target URL for "open app" actions
  const openActions = new Set(['open', 'track', 'dashboard', '']);
  if (!action || openActions.has(action)) {
    event.waitUntil(openWindow(url || '/'));
    return;
  }

  // Navigate actions — just open Maps or the app
  if (action === 'navigate' || action === 'navigate_customer') {
    event.waitUntil(openWindow(`https://maps.google.com/maps?q=${encodeURIComponent(notifData.deliveryAddress || '')}`));
    return;
  }

  if (action === 'call_customer' || action === 'call_partner') {
    event.waitUntil(openWindow(`tel:${notifData.phone || ''}`));
    return;
  }

  // Rate or Reorder
  if (action === 'rate') { event.waitUntil(openWindow(`/dashboard?rate=${orderId}`)); return; }
  if (action === 'reorder') { event.waitUntil(openWindow(`/menu?reorder=${orderId}`)); return; }

  // Quick Action API call (background, no window open)
  event.waitUntil(performQuickAction(action, orderId, stage, queueId));
});

// ─── Quick Action — Authenticated Window Delegation (Zero Token Leak) ────────
async function performQuickAction(action, orderId, stage, queueId) {
  if (action === 'stop_alert') {
    BROADCAST.postMessage({ type: 'STOP_ALERT', orderId });
    return;
  }

  const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (allClients && allClients.length > 0) {
    BROADCAST.postMessage({ type: 'PERFORM_ACTION', action, orderId, stage, queueId });
    return;
  }

  await openWindow(`/order/${orderId}?action=${action}`);
}

// ─── Background Sync Handler (auto-retry when back online) ──────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'olive_action_sync') {
    event.waitUntil(flushOfflineActions());
  }
});

async function flushOfflineActions() {
  const actions = await getAndClearOfflineActions();
  if (actions.length === 0) return;

  const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (allClients && allClients.length > 0) {
    for (const item of actions) {
      BROADCAST.postMessage({ type: 'PERFORM_ACTION', ...item });
    }
  }
}

// ─── Push Event (for non-Firebase message handling fallback) ─────────────────
self.addEventListener('push', event => {
  // Firebase compat SDK handles this, but we catch any raw pushes as fallback
  if (!event.data) return;
  try {
    const data = event.data.json();
    if (data.notification) return; // Already handled by Firebase SDK
    // Data-only message
    BROADCAST.postMessage({ type: 'DATA_PUSH', data });
  } catch {}
});

// ─── Window Focus Helper ──────────────────────────────────────────────────────
async function openWindow(url) {
  const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of allClients) {
    if (new URL(client.url).origin === self.location.origin) {
      client.focus();
      client.navigate(url);
      return;
    }
  }
  return clients.openWindow(url);
}

// ─── Message from App ──────────────────────────────────────────────────────────
self.addEventListener('message', async event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Lightweight offline homepage/app-shell cache ─────────────────────────────
// This shares the existing FCM worker file and does not cache API or account data.
// LocalStorage in the app stores the last-known-good homepage schema; this cache
// keeps the SPA shell and already-viewed public assets available for reloads offline.
const OP_HOME_SHELL_CACHE = 'olive-home-shell-v1';
const OP_STATIC_CACHE = 'olive-static-assets-v1';
const OP_PUBLIC_IMAGE_CACHE = 'olive-public-images-v1';
const OP_STATIC_CACHE_LIMIT = 120;
const OP_IMAGE_CACHE_LIMIT = 60;

async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    const excess = keys.length - maxEntries;
    if (excess > 0) await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
  } catch (_) {
    // Caching is an enhancement. Quota/privacy-mode failures must never break the app.
  }
}

async function cacheShellResponse(response) {
  if (!response || !response.ok) return;
  const cache = await caches.open(OP_HOME_SHELL_CACHE);
  await cache.put('/', response.clone());
  await cache.put('/index.html', response.clone());
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    // Pre-cache the shell plus its entry scripts/styles before controlling the page.
    // This means the very first successful online visit prepares the basics for the next
    // offline reload, instead of waiting until a later navigation to cache the JS bundle.
    try {
      const response = await fetch('/', { cache: 'reload' });
      if (response && response.ok) {
        await cacheShellResponse(response);
        const html = await response.clone().text();
        const referencedAssets = new Set();
        const assetPattern = /(?:src|href)=["']([^"'#]+\.(?:m?js|css|woff2?|ttf|otf)(?:\?[^"']*)?)["']/gi;
        let match;
        while ((match = assetPattern.exec(html)) !== null) {
          try {
            const assetUrl = new URL(match[1], self.location.origin);
            if (assetUrl.origin === self.location.origin &&
                /\.(?:m?js|css|woff2?|ttf|otf)$/i.test(assetUrl.pathname)) {
              referencedAssets.add(assetUrl.href);
            }
          } catch (_) {}
        }
        const staticCache = await caches.open(OP_STATIC_CACHE);
        await Promise.all(Array.from(referencedAssets).map(async (assetUrl) => {
          try {
            const assetResponse = await fetch(assetUrl);
            if (assetResponse && assetResponse.ok) {
              await staticCache.put(assetUrl, assetResponse.clone());
            }
          } catch (_) {}
        }));
        await trimCache(OP_STATIC_CACHE, OP_STATIC_CACHE_LIMIT);
      }
    } catch (_) {
      // An offline first installation cannot pre-cache files; keep install best-effort.
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const path = url.pathname;

  // Never cache business APIs or personal/transactional data.
  if (sameOrigin && (
    path.startsWith('/api/') ||
    path.startsWith('/website-manager/') ||
    path.startsWith('/auth/') ||
    path.startsWith('/checkout/') ||
    path.startsWith('/payments/')
  )) return;

  if (request.mode === 'navigate' && sameOrigin) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          try { await cacheShellResponse(response); } catch (_) {}
        }
        return response;
      } catch (_) {
        const cache = await caches.open(OP_HOME_SHELL_CACHE);
        const cached = await cache.match(request) || await cache.match('/') || await cache.match('/index.html');
        return cached || new Response(
          '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Olive Pizza</title><body style="font-family:system-ui;padding:24px"><h1>Olive Pizza</h1><p>You are offline and this device has not cached the app yet. Reconnect once to save the homepage for offline use.</p></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 }
        );
      }
    })());
    return;
  }

  const isSameOriginStatic = sameOrigin && /\.(?:js|css|woff2?|ttf|otf|svg|png|webp|avif|ico)$/i.test(path);
  const isPublicImage = !sameOrigin &&
    ['res.cloudinary.com', 'images.unsplash.com'].includes(url.hostname) &&
    (request.destination === 'image' || /\.(?:jpe?g|png|webp|avif)(?:$|\?)/i.test(url.href));

  if (!isSameOriginStatic && !isPublicImage) return;

  const cacheName = isPublicImage ? OP_PUBLIC_IMAGE_CACHE : OP_STATIC_CACHE;
  const maxEntries = isPublicImage ? OP_IMAGE_CACHE_LIMIT : OP_STATIC_CACHE_LIMIT;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    const refresh = fetch(request).then(async (response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        try {
          await cache.put(request, response.clone());
          await trimCache(cacheName, maxEntries);
        } catch (_) {}
      }
      return response;
    }).catch(() => null);

    if (cached) {
      event.waitUntil(refresh.then(() => undefined));
      return cached;
    }

    const response = await refresh;
    return response || new Response('', { status: 504, statusText: 'Offline asset unavailable' });
  })());
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const currentCaches = new Set([OP_HOME_SHELL_CACHE, OP_STATIC_CACHE, OP_PUBLIC_IMAGE_CACHE]);
    const allCaches = await caches.keys();
    await Promise.all(allCaches
      .filter((name) =>
        (name.startsWith('olive-home-shell-') ||
         name.startsWith('olive-static-assets-') ||
         name.startsWith('olive-public-images-')) && !currentCaches.has(name)
      )
      .map((name) => caches.delete(name)));
    await clients.claim();
  })());
});
