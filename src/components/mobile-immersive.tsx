"use client";

import { useEffect } from "react";
import { isMobileDevice, isStandalonePwa } from "@/lib/mobile";

const BOTTOM_EDGE_PX = 36;
const SWIPE_MIN_PX = 28;

/**
 * In the installed mobile PWA, enter fullscreen after the first interaction so
 * the system navigation bar (back / home / recents) is hidden. A swipe up from
 * the bottom edge exits fullscreen and reveals it again — the closest web
 * equivalent to "show the bar only when swiping from below".
 */
export function MobileImmersive() {
  useEffect(() => {
    if (!isMobileDevice() || !isStandalonePwa()) return;

    const root = document.documentElement;
    root.classList.add("pwa-mobile");

    const syncFullscreenClass = () => {
      root.classList.toggle("pwa-immersive", Boolean(document.fullscreenElement));
    };

    const requestFullscreen = () => {
      const el = document.documentElement as HTMLElement & {
        requestFullscreen?: () => Promise<void>;
        webkitRequestFullscreen?: () => Promise<void>;
      };
      const request =
        el.requestFullscreen?.bind(el) ??
        el.webkitRequestFullscreen?.bind(el);
      if (!request) return;
      void request().catch(() => {
        // Fullscreen may be blocked; safe-area padding still applies.
      });
    };

    let touchStartY = 0;

    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };

    const onTouchEnd = (event: TouchEvent) => {
      const endY = event.changedTouches[0]?.clientY ?? 0;
      const fromBottomEdge = touchStartY >= window.innerHeight - BOTTOM_EDGE_PX;
      const swipedUp = endY < touchStartY - SWIPE_MIN_PX;

      if (fromBottomEdge && swipedUp && document.fullscreenElement) {
        const exit =
          document.exitFullscreen?.bind(document) ??
          (
            document as Document & {
              webkitExitFullscreen?: () => Promise<void>;
            }
          ).webkitExitFullscreen?.bind(document);
        void exit?.().catch(() => {});
      }
    };

    const gestureEvents = ["pointerdown", "touchstart", "keydown"] as const;
    const onFirstGesture = () => {
      for (const type of gestureEvents) {
        window.removeEventListener(type, onFirstGesture);
      }
      requestFullscreen();
    };

    for (const type of gestureEvents) {
      window.addEventListener(type, onFirstGesture, { once: true });
    }

    document.addEventListener("fullscreenchange", syncFullscreenClass);
    document.addEventListener("webkitfullscreenchange", syncFullscreenClass);
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    syncFullscreenClass();

    return () => {
      for (const type of gestureEvents) {
        window.removeEventListener(type, onFirstGesture);
      }
      document.removeEventListener("fullscreenchange", syncFullscreenClass);
      document.removeEventListener("webkitfullscreenchange", syncFullscreenClass);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
      root.classList.remove("pwa-mobile", "pwa-immersive");
    };
  }, []);

  return null;
}
