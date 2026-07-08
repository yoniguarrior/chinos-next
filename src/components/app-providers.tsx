"use client";

import { useEffect } from "react";
import { SerwistProvider } from "@serwist/turbopack/react";
import { useAuthStore } from "@/stores/auth";
import { MobileBackGuard } from "@/components/mobile-back-guard";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

/**
 * Client-side bootstrapping (port of the Nuxt client plugins):
 * hydrates the auth session after mount and registers the PWA
 * service worker.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void useAuthStore.getState().getUser();

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

  return (
    <SerwistProvider swUrl="/serwist/sw.js">
      {children}
      <MobileBackGuard />
      <PwaInstallPrompt />
    </SerwistProvider>
  );
}
