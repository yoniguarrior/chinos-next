"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { isInRoom } from "@/lib/in-room";
import { isMobileDevice, isStandalonePwa } from "@/lib/mobile";

const EXIT_WINDOW_MS = 3000;
const BLOCK_STATE = { mobileBackTrap: true } as const;

/**
 * In the installed mobile PWA, the system back button must NOT navigate.
 * Outside a room: first press shows "press again to exit"; second press exits.
 * Inside a room: back is swallowed (leave only via in-app UI).
 */
export function MobileBackGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("misc");
  const [showTooltip, setShowTooltip] = useState(false);
  const armedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** Route we must stay on when the system back button is pressed. */
  const stayPathRef = useRef(pathname);

  useEffect(() => {
    stayPathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!isMobileDevice() || !isStandalonePwa()) return;

    const pushTrap = (path = stayPathRef.current) => {
      window.history.pushState(BLOCK_STATE, "", path);
    };

    const disarmExit = () => {
      armedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      setShowTooltip(false);
    };

    const exitApp = () => {
      window.close();
      window.history.go(-Math.max(window.history.length - 1, 1));
    };

    const onBackIntent = () => {
      if (isInRoom(stayPathRef.current)) return;

      if (armedRef.current) {
        disarmExit();
        exitApp();
        return;
      }

      armedRef.current = true;
      setShowTooltip(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(disarmExit, EXIT_WINDOW_MS);
    };

    // Keep a disposable history entry above the real page for this route.
    pushTrap();

    const onPopState = () => {
      const stayOn = stayPathRef.current;
      // Browser already moved history; put the URL back before Next keeps the
      // previous route, then re-arm the trap.
      pushTrap(stayOn);
      if (window.location.pathname !== stayOn) {
        router.replace(stayOn);
      }
      onBackIntent();
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname, router]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 left-1/2 z-9999 -translate-x-1/2 rounded-lg bg-black/80 px-5 py-2.5 text-sm text-white transition-opacity duration-300"
      style={{ opacity: showTooltip ? 1 : 0 }}
    >
      {t("press_back_again_to_exit")}
    </div>
  );
}
