/* Relue PWA service worker — shell offline + SWR p/ assets estáticos.
 * App é autenticado/dinâmico → navegação é network-first (sem cachear HTML). */
const CACHE = "relue-v1";
const PRECACHE = [
  "/offline.html",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // navegação: rede primeiro; offline → página de fallback
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }

  // assets estáticos: stale-while-revalidate
  if (/\.(png|jpg|jpeg|webp|svg|ico|css|woff2?|json|webmanifest)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then(async (c) => {
        const cached = await c.match(req);
        const network = fetch(req)
          .then((r) => {
            if (r && r.ok) c.put(req, r.clone());
            return r;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
