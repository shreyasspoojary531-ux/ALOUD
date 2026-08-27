const CACHE_NAME = "aloud-offline-v2";
const OFFLINE_URLS = [
  "/",
  "/home",
  "/spell",
  "/setup",
  "/profile",
  "/offline.html",
  "/styles/globals.css",
  "/styles/tokens.css",
  "/manifest.json",
];

// Install: Force caching of offline app shell and offline page immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(OFFLINE_URLS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate: Immediately claim control of all open windows
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Intercept all requests to prevent Chrome Dino offline page on reload
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Gemini AI suggestion route: return empty JSON array offline
  if (url.pathname.startsWith("/api/suggest")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ suggestions: [] }), {
          headers: { "Content-Type": "application/json" },
        });
      })
    );
    return;
  }

  // Navigation / HTML requests: Network first -> Cache -> /offline.html
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const resClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
          }
          return response;
        })
        .catch(async () => {
          // If offline: try matching exact request from cache
          const cachedMatch = await caches.match(request);
          if (cachedMatch) return cachedMatch;

          // Try home page cache
          const homeMatch = await caches.match("/home");
          if (homeMatch) return homeMatch;

          // Serve standalone offline HTML page (Zero Chrome Dino page!)
          const offlinePage = await caches.match("/offline.html");
          if (offlinePage) return offlinePage;

          return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
        })
    );
    return;
  }

  // Static assets (CSS, JS, Fonts, Images): Cache first -> Network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
        }
        return networkResponse;
      }).catch(() => {
        return new Response("", { status: 404 });
      });
    })
  );
});
