const CACHE_NAME = "aloud-pwa-v3";
const APP_SHELL_URLS = [
  "/",
  "/home",
  "/spell",
  "/setup",
  "/profile",
  "/settings",
  "/offline.html",
  "/styles/globals.css",
  "/styles/tokens.css",
  "/manifest.json",
];

// Install: Cache core app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_SHELL_URLS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches immediately
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

// Fetch handler
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. NEVER cache Gemini AI suggestion requests (/api/suggest)
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

  // 2. NEVER cache Telegram caregiver alert API requests (/api/telegram/*)
  if (url.pathname.startsWith("/api/telegram")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ ok: false, error: "Network unavailable" }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      })
    );
    return;
  }

  // 3. Exclude /naruto Easter-egg route and assets from caching to prevent video stream interference
  if (url.pathname.startsWith("/naruto")) {
    event.respondWith(fetch(request));
    return;
  }

  // 4. Cache-first strategy for MediaPipe WASM and model files (CDN & local)
  if (
    url.hostname.includes("cdn.jsdelivr.net") ||
    url.hostname.includes("storage.googleapis.com")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 5. Navigation / HTML document requests: Network first -> Cache fallback -> /offline.html
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cachedMatch = await caches.match(request);
          if (cachedMatch) return cachedMatch;

          const homeMatch = await caches.match("/home");
          if (homeMatch) return homeMatch;

          const offlinePage = await caches.match("/offline.html");
          if (offlinePage) return offlinePage;

          return new Response("Offline", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        })
    );
    return;
  }

  // 6. Static Assets (CSS, JS, Fonts, Images): Cache first -> Network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => new Response("", { status: 404 }));
    })
  );
});
