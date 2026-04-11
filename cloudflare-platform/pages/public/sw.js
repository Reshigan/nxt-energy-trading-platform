// NXT Energy Trading Platform - Service Worker
// Handles offline caching, push notifications, and background sync

// Item 19: Removed API_CACHE — financial data must never be served from stale cache
const CACHE_NAME = 'nxt-energy-v3';
const STATIC_CACHE = 'nxt-static-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Item 19: Removed API_ROUTES list — no API caching for financial endpoints

// Install event - cache static assets only
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches (including old API caches)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== STATIC_CACHE && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first for API, cache first for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Item 19: API requests MUST NOT be cached — always go to network
  // Financial data (trading, carbon, settlement) must never be stale
  if (url.pathname.startsWith('/api/')) {
    return; // Let the browser handle normally — no cache interception
  }

  // Static assets: cache first, fallback to network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.png') || url.pathname.endsWith('.woff2'))) {
          const cloned = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, cloned));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback for navigation requests
      if (request.mode === 'navigate') {
        return caches.match('/index.html');
      }
      return new Response('Offline', { status: 503 });
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  const defaults = {
    title: 'NXT Energy Trading',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'nxt-notification',
    data: { url: '/dashboard' },
  };

  let data = defaults;
  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...defaults, ...payload };
    }
  } catch {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || defaults.icon,
    badge: data.badge || defaults.badge,
    tag: data.tag || defaults.tag,
    data: data.data || defaults.data,
    vibrate: [100, 50, 100],
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || defaults.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const client = clients.find((c) => c.url.includes(url));
        if (client) {
          return client.focus();
        }
        return self.clients.openWindow(url);
      })
  );
});

// Item 19: Removed syncPendingTrades() and syncPendingReadings()
// Financial data must never be synced from stale offline cache.
// All trading/metering operations require live network connectivity.

// Item 19: Removed periodicsync for market data — stale price data
// is dangerous for a financial trading platform.
