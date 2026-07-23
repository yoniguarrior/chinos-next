"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { isInRoom } from "@/lib/in-room";
import { isMobileDevice, isStandalonePwa } from "@/lib/mobile";

const EXIT_WINDOW_MS = 3000;
const BLOCK_STATE = { mobileBackTrap: true } as const;

/**
 * Installed mobile PWA: system back must not navigate.
 * - First press: centered "press again to exit" toast (3s window).
 * - Second press within the window: leave the app.
 * - After the window expires: next press shows the toast again (does not exit).
 * Inside a room: back is swallowed (leave only via in-app UI).
 */
export function MobileBackGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("misc");
  const [showTooltip, setShowTooltip] = useState(false);
  const armedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stayPathRef = useRef(pathname);
  const routerRef = useRef(router);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    stayPathRef.current = pathname;
  }, [pathname]);

  // After in-app navigations, reset the exit arm and keep a trap on the new route.
  useEffect(() => {
    if (!isMobileDevice() || !isStandalonePwa()) return;

    armedRef.current = false;
    setShowTooltip(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }

    window.history.pushState(BLOCK_STATE, "", pathname);
  }, [pathname]);

  // Stable back listener (must NOT rebind on every pathname change — that was
  // clearing the 3s timer while leaving armed=true, so the next back always exited).
  useEffect(() => {
    if (!isMobileDevice() || !isStandalonePwa()) return;

    const pushTrap = (path = stayPathRef.current) => {
      window.history.pushState(BLOCK_STATE, "", path);
    };

    const disarmExit = () => {
      armedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
      setShowTooltip(false);
    };

    const exitApp = () => {
      disarmExit();
      window.close();
      // Android installed PWAs often ignore window.close(); drain history instead.
      window.history.go(-Math.max(window.history.length - 1, 1));
    };

    // Seed two traps so the first system-back cannot empty the stack (Android
    // closes the PWA when there is nothing left to pop, sometimes without popstate).
    pushTrap();
    pushTrap();

    const onPopState = () => {
      const stayOn = stayPathRef.current;

      // Restore depth immediately so Android does not treat this as "leave app".
      pushTrap(stayOn);
      pushTrap(stayOn);

      if (window.location.pathname !== stayOn) {
        routerRef.current.replace(stayOn);
      }

      if (isInRoom(stayOn)) return;

      if (armedRef.current) {
        exitApp();
        return;
      }

      armedRef.current = true;
      setShowTooltip(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(disarmExit, EXIT_WINDOW_MS);
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      disarmExit();
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed top-1/2 left-1/2 z-9999 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black/80 px-5 py-2.5 text-sm text-white transition-opacity duration-300"
      style={{ opacity: showTooltip ? 1 : 0 }}
    >
      {t("press_back_again_to_exit")}
    </div>
  );
}
