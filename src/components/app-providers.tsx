"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";

/**
 * Client-side bootstrapping (port of the Nuxt client plugins):
 * hydrates the auth session after mount.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void useAuthStore.getState().getUser();
  }, []);

  return <>{children}</>;
}
