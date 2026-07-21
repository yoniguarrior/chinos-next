"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { isInRoom } from "@/lib/in-room";
import { isMobileDevice, isStandalonePwa } from "@/lib/mobile";

const EXIT_WINDOW_MS = 3000;
const BLOCK_STATE = { mobileBackTrap: true } as const;

/**
 * In the installed mobile PWA (outside a room), replaces the hardware back
 * button with a double-press-to-exit flow. While inside a room, back is fully
 * blocked until the player leaves via the in-app exit flow.
 */
export function MobileBackGuard() {
  const pathname = usePathname();
  const t = useTranslations("misc");
  const [showTooltip, setShowTooltip] = useState(false);
  const armedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!isMobileDevice() || !isStandalonePwa()) return;

    const pushTrap = () => {
      window.history.pushState(BLOCK_STATE, "", window.location.href);
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

    const handleBack = () => {
      if (isInRoom(pathnameRef.current)) {
        return;
      }

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
  }, []);

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
