import { useEffect, useRef } from "react";

/**
 * Requests a screen wake lock while the component is mounted.
 * The lock is automatically released on unmount, and re-acquired
 * when the page becomes visible again after being backgrounded
 * (e.g. user switches apps and comes back).
 */
export function useWakeLock() {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!("wakeLock" in navigator)) return;

    let cancelled = false;

    async function acquire() {
      try {
        lockRef.current = await navigator.wakeLock.request("screen");
      } catch {
        // Permission denied or tab invisible — silently ignore.
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && !cancelled) {
        void acquire();
      }
    }

    void acquire();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, []);
}
