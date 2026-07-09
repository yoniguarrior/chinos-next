"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { isMobileDevice, isStandalonePwa } from "@/lib/mobile";

const EXIT_WINDOW_MS = 3000;
const BLOCK_STATE = { mobileBackTrap: true } as const;

/**
 * In the installed mobile PWA, disables the standard back button and replaces
 * it with a double-press-to-exit flow: first back shows a short message,
 * second back within the window closes the app.
 */
export function MobileBackGuard() {
  const t = useTranslations("misc");
  const [showTooltip, setShowTooltip] = useState(false);
  const armedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
      // window.close() is often blocked in PWAs; fall back to leaving history.
      window.history.go(-Math.max(window.history.length - 1, 1));
    };

    const handleBack = () => {
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
      className="pointer-events-none fixed bottom-5 left-1/2 z-[9999] -translate-x-1/2 rounded-lg bg-black/80 px-5 py-2.5 text-sm text-white transition-opacity duration-300"
      style={{ opacity: showTooltip ? 1 : 0 }}
    >
      {t("press_back_again_to_exit")}
    </div>
  );
}
