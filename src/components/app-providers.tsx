"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SerwistProvider } from "@serwist/turbopack/react";
import { useAuthStore } from "@/stores/auth";
import { MobileBackGuard } from "@/components/mobile-back-guard";
import { MobileImmersive } from "@/components/mobile-immersive";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { isStandalonePwa } from "@/lib/mobile";

const isDev = process.env.NODE_ENV === "development";

/** In dev, drop any registered workers/caches so stale PWA assets cannot break Turbopack HMR. */
async function clearDevServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((r) => r.unregister()));
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

/**
 * Client-side bootstrapping (port of the Nuxt client plugins):
 * hydrates the auth session after mount and registers the PWA
 * service worker (production only).
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    void useAuthStore.getState().getUser();

    if (isDev) {
      void clearDevServiceWorkers();
      return;
    }

    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // When a new service worker takes control after a redeploy, reload once so
    // the page runs against fresh HTML/JS. Without this the installed PWA can
    // keep serving a stale precached shell whose chunk files 404 on the server,
    // leaving the client un-hydrated (dead buttons, menu and data).
    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;
    const handleControllerChange = () => {
      if (!hadController || refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    // Proactively check for a newer worker so a broken/stale one is replaced.
    void navigator.serviceWorker
      .getRegistration()
      .then((registration) => registration?.update())
      .catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, []);

  // Cold-start of the installed PWA often serves a stale precached "/".
  // Force a server refresh once per session on the home route.
  useEffect(() => {
    if (!isStandalonePwa() || pathname !== "/") return;
    const key = "pwa-home-refreshed";
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
    router.refresh();
  }, [pathname, router]);

  const extras = (
    <>
      {children}
      <MobileBackGuard />
      <MobileImmersive />
      <PwaInstallPrompt />
    </>
  );

  if (isDev) {
    return extras;
  }

  return (
    <SerwistProvider swUrl="/serwist/sw.js" cacheOnNavigation={false}>
      {extras}
    </SerwistProvider>
  );
}
