const PRECACHE = 'precache-v1';
const RUNTIME = 'runtime';

const PRECACHE_URLS = [
];
const NEVER_CACHE = [
  '/index.html',
  '/',
  '/styles.css',
  '/main.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(self.skipWaiting())
  );
});

// The activate handler takes care of cleaning up old caches.
self.addEventListener('activate', event => {
  const currentCaches = [PRECACHE, RUNTIME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', async event => {
  if (!event.request.url.startsWith(self.location.origin)) return;
  const url = new URL(event.request.url);
  const pathname = url.pathname;
  if (NEVER_CACHE.includes(pathname)) return;

  event.respondWith((async () => {
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse) return cachedResponse;

    let response = {};
    let timeout = 0;
    if (pathname === '/start.json') {
      response.success = true;
    } else if (pathname === '/build-house.json') {
      timeout = 10;
    }

    if (timeout) {
      await new Promise(resolve => setTimeout(resolve, timeout * 1000));
    }

    return new Response(JSON.stringify(response), {
      headers: {'Content-Type': 'application/json'}
    });
  })());
});
