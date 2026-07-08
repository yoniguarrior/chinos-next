"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getLocalState } from "@/lib/local-state";
import { isMobileDevice } from "@/lib/mobile";

const EXIT_WINDOW_MS = 2000;
const BLOCK_STATE = { mobileBackTrap: true } as const;

type BackAction = { type: "navigate"; href: string } | { type: "exit-app" };

function resolveBackAction(pathname: string): BackAction {
  const room = getLocalState().room;

  if (room) {
    const roomPath = `/rooms/${encodeURIComponent(room)}`;
    if (pathname !== roomPath) {
      return { type: "navigate", href: roomPath };
    }
    return { type: "navigate", href: "/rooms" };
  }

  if (pathname === "/") {
    return { type: "exit-app" };
  }

  if (pathname === "/rooms" || pathname === "/rooms/create") {
    return { type: "navigate", href: "/" };
  }

  if (pathname.startsWith("/rooms/join/")) {
    return { type: "navigate", href: "/rooms" };
  }

  if (/^\/rooms\/[^/]+$/.test(pathname)) {
    return { type: "navigate", href: "/rooms" };
  }

  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/register-success" ||
    pathname === "/logout"
  ) {
    return { type: "navigate", href: "/" };
  }

  if (
    pathname.startsWith("/verify-email/") ||
    pathname.startsWith("/verify-forgot-pass/")
  ) {
    return { type: "navigate", href: "/login" };
  }

  if (pathname === "/profile") {
    return { type: "navigate", href: "/" };
  }

  if (
    pathname === "/history" ||
    pathname === "/rules" ||
    pathname === "/ranking" ||
    pathname === "/privacy" ||
    pathname === "/cookies" ||
    pathname === "/legal"
  ) {
    return { type: "navigate", href: "/" };
  }

  return { type: "navigate", href: "/" };
}

/**
 * Fully replaces the mobile hardware back button with app-like navigation.
 * The browser history stack is trapped (every popstate is cancelled) and back
 * follows our own route map instead of the real history depth.
 */
export function MobileBackGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("misc");
  const [showTooltip, setShowTooltip] = useState(false);
  const pathnameRef = useRef(pathname);
  const armedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!isMobileDevice()) return;

    const pushTrap = () => {
      window.history.pushState(BLOCK_STATE, "", window.location.href);
    };

    const disarmExit = () => {
      armedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      setShowTooltip(false);
    };

    const handleBack = () => {
      const action = resolveBackAction(pathnameRef.current);

      if (action.type === "navigate") {
        disarmExit();
        router.replace(action.href);
        return;
      }

      if (armedRef.current) {
        disarmExit();
        window.close();
        return;
      }

      armedRef.current = true;
      setShowTooltip(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(disarmExit, EXIT_WINDOW_MS);
    };

    pushTrap();

    const onPopState = () => {
      pushTrap();
      handleBack();
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [router]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 left-1/2 z-[9999] -translate-x-1/2 rounded-lg bg-black/80 px-5 py-2.5 text-sm text-white transition-opacity duration-300"
      style={{ opacity: showTooltip ? 1 : 0 }}
    >
      {t("press_back_again_to_exit")}
    </div>
  );
}
