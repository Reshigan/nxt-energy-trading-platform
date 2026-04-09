// NXT Energy Trading Platform - Service Worker
// Handles offline caching, push notifications, and background sync

const CACHE_NAME = 'nxt-energy-v2';
const STATIC_CACHE = 'nxt-static-v2';
const API_CACHE = 'nxt-api-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

const API_ROUTES = [
  '/api/v1/market/insights',
  '/api/v1/market/prices',
  '/api/v1/carbon/credits',
  '/api/v1/portfolio',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== STATIC_CACHE && key !== API_CACHE && key !== CACHE_NAME)
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

  // API requests: network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
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

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-trades') {
    event.waitUntil(syncPendingTrades());
  }
  if (event.tag === 'sync-readings') {
    event.waitUntil(syncPendingReadings());
  }
});

async function syncPendingTrades() {
  try {
    const cache = await caches.open('nxt-pending-v1');
    const requests = await cache.keys();
    const tradeRequests = requests.filter((r) => r.url.includes('/trades'));
    for (const req of tradeRequests) {
      const response = await cache.match(req);
      if (response) {
        const body = await response.json();
        await fetch(req.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        await cache.delete(req);
      }
    }
  } catch { /* retry on next sync */ }
}

async function syncPendingReadings() {
  try {
    const cache = await caches.open('nxt-pending-v1');
    const requests = await cache.keys();
    const readingRequests = requests.filter((r) => r.url.includes('/metering'));
    for (const req of readingRequests) {
      const response = await cache.match(req);
      if (response) {
        const body = await response.json();
        await fetch(req.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        await cache.delete(req);
      }
    }
  } catch { /* retry on next sync */ }
}

// Periodic background sync for market data
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'refresh-market-data') {
    event.waitUntil(refreshMarketData());
  }
});

async function refreshMarketData() {
  try {
    const response = await fetch('/api/v1/market/prices');
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      await cache.put('/api/v1/market/prices', response);
    }
  } catch { /* silent fail */ }
}
