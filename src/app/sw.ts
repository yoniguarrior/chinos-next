import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import {
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";
import { defaultCache } from "@serwist/turbopack/worker";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Serve Next.js build assets with StaleWhileRevalidate instead of the default
// CacheFirst. They are content-hashed so CacheFirst is normally safe, but SWR
// revalidates in the background so a redeploy is picked up on the next visit.
const runtimeCaching: RuntimeCaching[] = [
  {
    // Always try the network first for HTML navigations so the PWA start URL
    // (/) is not served from a stale precached shell after a redeploy.
    matcher: ({ request, url: { origin } }) =>
      request.mode === "navigate" && origin === self.location.origin,
    handler: new NetworkFirst({
      cacheName: "pages-navigate",
      networkTimeoutSeconds: 5,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 16,
          maxAgeSeconds: 5 * 60,
        }),
      ],
    }),
  },
  {
    matcher: /\/_next\/static\/.+\.js$/i,
    handler: new StaleWhileRevalidate({ cacheName: "next-static-js-assets" }),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

serwist.addEventListeners();

// Drop stale HTML caches whenever a new worker activates.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) =>
              ["pages", "pages-navigate", "pages-rsc", "pages-rsc-prefetch"].includes(
                key,
              ),
            )
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});
