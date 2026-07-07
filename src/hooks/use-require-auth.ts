"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";

/**
 * Client-side auth guard (equivalent to Nuxt's `auth.global.ts` middleware
 * for pages with `requiresAuth: true`). Redirects to /login?redirect=<path>
 * once the session hydration finished and the user is not logged in.
 */
export function useRequireAuth(): { isReady: boolean; isLogged: boolean } {
  const router = useRouter();
  const pathname = usePathname();
  const isReady = useAuthStore((s) => s.isReady);
  const isLogged = useAuthStore((s) => s.user.userId !== "");

  useEffect(() => {
    if (isReady && !isLogged) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isReady, isLogged, router, pathname]);

  return { isReady, isLogged };
}
