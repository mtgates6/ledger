const CACHE_NAME = "ledger-shell-v1";
const SHELL_URLS = ["/dashboard", "/transactions", "/transactions/new"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

// Network-first for navigations so data stays fresh; fall back to the
// cached shell when offline so the app still opens.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(
      () => caches.match(event.request) || caches.match("/dashboard")
    )
  );
});
