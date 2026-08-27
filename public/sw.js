const CACHE_NAME = "aloud-offline-v1";
const OFFLINE_URLS = [
  "/",
  "/home",
  "/spell",
  "/setup",
  "/profile",
];

// Install: Cache core application pages
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches if any
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

// Fetch: Serve from cache when offline, fallback gracefully
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Handle Gemini AI suggestion API requests offline: return empty JSON array
  if (url.pathname.startsWith("/api/suggest")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ suggestions: [] }), {
          headers: { "Content-Type": "application/json" },
        });
      })
    );
    return;
  }

  // Network-first with Cache-fallback for HTML/JS/CSS page requests
  if (event.request.mode === "navigate" || event.request.destination === "document") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and update cache with latest online version
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return response;
        })
        .catch(async () => {
          // Device is offline: serve from cache if available
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;

          const homeCache = await caches.match("/home");
          if (homeCache) return homeCache;

          const rootCache = await caches.match("/");
          if (rootCache) return rootCache;

          // Ultimate offline HTML fallback if nothing cached
          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Aloud — Offline</title>
              <style>
                body { font-family: sans-serif; background: #f7f1e6; color: #28221b; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
                .card { background: #fffaf1; padding: 32px; border-radius: 20px; box-shadow: 0 14px 22px rgba(52, 40, 23, 0.13); max-width: 440px; border-top: 4px solid #cf5700; }
                h1 { color: #cf5700; font-family: Georgia, serif; margin-top: 0; }
                button { background: #cf5700; color: #fff; border: none; padding: 12px 24px; border-radius: 999px; font-weight: bold; cursor: pointer; margin-top: 16px; font-size: 1rem; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>You're Offline</h1>
                <p>Aloud is ready to run offline. Please reload when internet is restored or try again.</p>
                <button onclick="window.location.reload()">Retry Connection</button>
              </div>
            </body>
            </html>`,
            { headers: { "Content-Type": "text/html" } }
          );
        })
    );
    return;
  }

  // Cache-first for static assets (images, fonts, scripts)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((response) => {
          if (response.status === 200) {
            const resClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return response;
        })
      );
    })
  );
});
