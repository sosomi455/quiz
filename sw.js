const CACHE_NAME = 'quiz-cache-v12';
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

// 네트워크 우선: 온라인이면 항상 최신 파일, 실패(오프라인)하면 캐시로 대체.
// → data.js 등을 수정하면 새로고침만으로 바로 반영됨 (버전 올릴 필요 없음).
async function networkFirst(request, isNavigate) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (isNavigate) {
      const url = new URL(request.url);
      if (url.pathname.endsWith('/ingredients.html')) {
        return cache.match('./ingredients.html');
      }
      return cache.match('./quiz.html');
    }
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(networkFirst(event.request, event.request.mode === 'navigate'));
});
