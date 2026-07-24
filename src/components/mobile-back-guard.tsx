"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { isInRoom } from "@/lib/in-room";
import { isMobileDevice, isStandalonePwa } from "@/lib/mobile";

const EXIT_WINDOW_MS = 3000;
const TRAP_DEPTH = 5;
const BLOCK_STATE = { mobileBackTrap: true } as const;
const EXITING_KEY = "pwa-allow-exit";

/**
 * Installed mobile PWA: system back must not navigate away.
 *
 * Double-press uses a timestamp window (not a sticky flag). History traps are
 * re-seeded on every back and when the toast expires so Android does not close
 * the activity when the stack would otherwise be empty.
 */
export function MobileBackGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("misc");
  const [showTooltip, setShowTooltip] = useState(false);

  const stayPathRef = useRef(pathname);
  const routerRef = useRef(router);
  const lastBackAtRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    stayPathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useLayoutEffect(() => {
    if (!isMobileDevice() || !isStandalonePwa()) return;

    const ensureTraps = (path = stayPathRef.current) => {
      for (let i = 0; i < TRAP_DEPTH; i += 1) {
        window.history.pushState(
          { ...BLOCK_STATE, n: i, t: Date.now() },
          "",
          path,
        );
      }
    };

    const clearHideTimer = () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = undefined;
      }
    };

    const resetExitWindow = () => {
      lastBackAtRef.current = 0;
      clearHideTimer();
      setShowTooltip(false);
    };

    const hideToast = () => {
      setShowTooltip(false);
      // Critical: rebuild depth when the 3s window ends, otherwise the next
      // system-back can empty the stack and Android closes the PWA.
      ensureTraps();
    };

    const exitApp = () => {
      resetExitWindow();
      try {
        sessionStorage.setItem(EXITING_KEY, "1");
      } catch {
        // ignore
      }
      window.close();
      window.history.go(-Math.max(window.history.length - 1, 1));
    };

    const onBackIntent = () => {
      if (isInRoom(stayPathRef.current)) return;

      const now = Date.now();
      if (
        lastBackAtRef.current > 0 &&
        now - lastBackAtRef.current < EXIT_WINDOW_MS
      ) {
        exitApp();
        return;
      }

      lastBackAtRef.current = now;
      setShowTooltip(true);
      clearHideTimer();
      hideTimerRef.current = setTimeout(hideToast, EXIT_WINDOW_MS);
    };

    const onPopState = () => {
      try {
        if (sessionStorage.getItem(EXITING_KEY) === "1") return;
      } catch {
        // ignore
      }

      // When popstate runs, location is already the history target (previous).
      const stayOn = stayPathRef.current;
      const poppedTo = window.location.pathname;

      ensureTraps(stayOn);
      if (poppedTo !== stayOn) {
        routerRef.current.replace(stayOn);
      }

      onBackIntent();
    };

    const onFullscreenChange = () => {
      if (document.fullscreenElement) return;
      ensureTraps();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") ensureTraps();
    };

    try {
      sessionStorage.removeItem(EXITING_KEY);
    } catch {
      // ignore
    }

    resetExitWindow();
    ensureTraps();

    window.addEventListener("popstate", onPopState);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        onFullscreenChange,
      );
      document.removeEventListener("visibilitychange", onVisible);
      clearHideTimer();
    };
  }, [pathname]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed top-1/2 left-1/2 z-9999 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black/80 px-5 py-2.5 text-sm whitespace-nowrap text-white transition-opacity duration-300"
      style={{ opacity: showTooltip ? 1 : 0 }}
    >
      {t("press_back_again_to_exit")}
    </div>
  );
}
