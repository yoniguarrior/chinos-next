import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { Serwist, StaleWhileRevalidate } from "serwist";
import { defaultCache } from "@serwist/turbopack/worker";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Serve Next.js build assets with StaleWhileRevalidate instead of the default
// CacheFirst. They are content-hashed so CacheFirst is normally safe, but SWR
// revalidates in the background so a redeploy is picked up on the next visit
// and the PWA never gets stuck on stale chunks.
const runtimeCaching: RuntimeCaching[] = [
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
  fallbacks: {
    entries: [
      {
        url: "/",
        // navigateFallback "/" with an /api denylist, like the old
        // Workbox config.
        matcher({ request }) {
          return (
            request.destination === "document" &&
            !new URL(request.url).pathname.startsWith("/api/")
          );
        },
      },
    ],
  },
});

serwist.addEventListeners();
