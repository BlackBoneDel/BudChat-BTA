// Service Worker básico para Budsin Chat (PWA)
// Estrategia: cache de shell (app shell) + network-first para datos.
const CACHE = "budsin-chat-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Si es una llamada a la API o WebSocket, dejar que la red responda.
  if (url.origin !== self.location.origin) return;

  // Cache-first para assets estáticos (JS, CSS, iconos).
  if (/\.(?:js|css|svg|png|jpg|woff2)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          caches.open(CACHE).then((c) => c.add(request).then(() => cached))
      )
    );
    return;
  }

  // Network-first para el HTML (siempre cargar la shell actualizada).
  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return res;
      })
      .catch(() => caches.match("./index.html"))
  );
});
