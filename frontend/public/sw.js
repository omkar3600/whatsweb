// WhatsWeb PWA & Offline Service Worker
const CACHE_NAME = 'whatsweb-offline-v4';
const OFFLINE_URL = '/offline.html';

// Install Event: Cache Offline Fallback Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        OFFLINE_URL,
        '/whatsweb-logo.png',
        '/favicon.png',
        '/manifest.json'
      ]);
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean Old Caches & Claim Clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Serve cached offline page when network request fails on navigation
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(OFFLINE_URL);
        return cachedResponse || new Response('Offline', {
          status: 503,
          headers: { 'Content-Type': 'text/html' }
        });
      })
    );
  }
});

// Background Push Event Handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'WhatsWeb Notification';
    const options = {
      body: payload.body || 'New message received',
      icon: payload.icon || '/whatsweb-logo.png',
      badge: payload.badge || '/whatsweb-logo.png',
      tag: payload.tag || 'whatsweb-message',
      data: payload.data || { url: '/inbox' },
      vibrate: [100, 50, 100],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[SW] Error showing push notification:', err);
  }
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/inbox';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/inbox') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
