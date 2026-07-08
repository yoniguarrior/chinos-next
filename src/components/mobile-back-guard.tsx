"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getLocalState } from "@/lib/local-state";

const MOBILE_UA =
  /(android|bb\d+|meego).+mobile|armv7l|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|redmi|series[46]0|samsungbrowser.*mobile|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i;

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return MOBILE_UA.test(ua) && !/CrOS/.test(ua);
}

const EXIT_WINDOW_MS = 2000;

/**
 * App-like handling of the mobile hardware back button:
 * - Keeps a sentinel history entry so the first back press is intercepted
 *   instead of leaving the site immediately.
 * - If the player is in a room, back returns to that room.
 * - Otherwise the first back shows "press back again to exit" and only the
 *   second press within a short window actually leaves the app.
 *
 * Unlike the previous implementation, it does NOT redirect to "/" on mount, so
 * deep links and shared room URLs keep working on mobile.
 */
export function MobileBackGuard() {
  const router = useRouter();
  const t = useTranslations("misc");
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (!isMobileDevice()) return;

    let armed = false;
    let leaving = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const pushGuard = () => {
      window.history.pushState({ chBackGuard: true }, "");
    };

    pushGuard();

    const handlePopState = () => {
      if (leaving) {
        leaving = false;
        return;
      }

      const roomName = getLocalState().room;
      if (roomName) {
        void router.replace(`/rooms/${encodeURIComponent(roomName)}`);
        pushGuard();
        return;
      }

      if (armed) {
        armed = false;
        if (timer) clearTimeout(timer);
        setShowTooltip(false);
        leaving = true;
        window.history.back();
        return;
      }

      armed = true;
      setShowTooltip(true);
      pushGuard();
      timer = setTimeout(() => {
        armed = false;
        setShowTooltip(false);
      }, EXIT_WINDOW_MS);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (timer) clearTimeout(timer);
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
