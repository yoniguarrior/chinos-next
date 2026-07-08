"use client";

import { useEffect } from "react";
import { SerwistProvider } from "@serwist/turbopack/react";
import { useAuthStore } from "@/stores/auth";
import { MobileBackGuard } from "@/components/mobile-back-guard";

/**
 * Client-side bootstrapping (port of the Nuxt client plugins):
 * hydrates the auth session after mount and registers the PWA
 * service worker.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void useAuthStore.getState().getUser();
  }, []);

  return (
    <SerwistProvider swUrl="/serwist/sw.js">
      {children}
      <MobileBackGuard />
    </SerwistProvider>
  );
}
