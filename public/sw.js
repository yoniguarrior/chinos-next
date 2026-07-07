// Kill-switch service worker.
//
// The previous Nuxt PWA (@vite-pwa/nuxt) registered a service worker at
// `/sw.js` with scope `/`. It stays cached in returning visitors' browsers and
// keeps serving the old Nuxt app shell, which requests Nuxt-only files such as
// `/_payload.json` and `/_i18n/.../messages.json` (now 404) and breaks
// translations.
//
// The new Next.js app registers its own worker at `/serwist/sw.js`, so the old
// `/sw.js` is never replaced automatically. Browsers re-fetch the worker script
// at its registered URL on navigation; serving this file makes the old worker
// unregister itself, wipe its caches, and reload open tabs into the fresh app.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));

      await self.registration.unregister();

      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })(),
  );
});
