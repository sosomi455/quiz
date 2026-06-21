const CACHE_NAME = 'quiz-cache-v4';
const ASSETS = [
  './quiz.html',
  './ingredients.html',
  './data.js',
  './ingredients.js',
  './quiz-manifest.json',
  './ingredients-manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
    await self.clients.claim();
  })());
});

async function cacheFirstNavigate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) {
    // Background refresh
    fetch(request).then((res) => {
      if (res && res.status === 200) cache.put(request, res.clone());
    }).catch(() => {});
    return cached;
  }
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/ingredients.html')) {
      return cache.match('./ingredients.html');
    }
    return cache.match('./quiz.html');
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(cacheFirstNavigate(event.request));
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request, { ignoreSearch: true });
      if (cached) {
        fetch(event.request).then((res) => {
          if (res && res.status === 200) cache.put(event.request, res.clone());
        }).catch(() => {});
        return cached;
      }
      try {
        const res = await fetch(event.request);
        if (res && res.status === 200) cache.put(event.request, res.clone());
        return res;
      } catch {
        return cache.match(event.request, { ignoreSearch: true });
      }
    })
  );
});
