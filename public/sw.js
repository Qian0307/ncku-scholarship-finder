// 輕量 Service Worker：靜態資源快取優先、頁面線上優先（離線時回退快取）。
// 線上優先確保有網路時永遠拿到最新內容，不會顯示過期資料。
const CACHE = 'ncku-schol-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isStatic =
    url.pathname.startsWith('/_next/static') ||
    /\.(css|js|woff2?|png|jpg|jpeg|svg|ico)$/.test(url.pathname);

  if (isStatic) {
    // 靜態資源：快取優先
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // 頁面／其他：線上優先，失敗才回退快取（無快取則回首頁）
  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        if (res.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        const cache = await caches.open(CACHE);
        return (await cache.match(req)) || (await cache.match('/')) || Response.error();
      }
    })()
  );
});
