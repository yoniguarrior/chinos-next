"use client";

import { useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_COOKIE = "pwa-install-dismissed";
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
  return document.cookie.split("; ").some((c) => c === `${DISMISS_COOKIE}=1`);
}

function setDismissed(): void {
  const maxAge = DISMISS_DAYS * 24 * 60 * 60;
  document.cookie = `${DISMISS_COOKIE}=1;path=/;max-age=${maxAge};samesite=lax`;
}

/**
 * Restores the "install the app" suggestion the previous Nuxt app showed,
 * without any custom UI.
 *
 * Browsers only allow opening the native install dialog from a user gesture, so
 * we capture `beforeinstallprompt` and then open the dialog on the very first
 * interaction (tap/click/key) with the page. Dismissing it (native "cancel")
 * stores a cookie for a few days so it does not reappear on every navigation
 * or refresh.
 */
export function PwaInstallPrompt() {
  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    if (isDismissed()) return;

    let deferredPrompt: BeforeInstallPromptEvent | null = null;
    const gestureEvents = ["pointerdown", "keydown", "touchstart"] as const;

    const showPrompt = () => {
      const promptEvent = deferredPrompt;
      removeGestureListeners();
      if (!promptEvent) return;
      deferredPrompt = null;

      void (async () => {
        try {
          await promptEvent.prompt();
          const { outcome } = await promptEvent.userChoice;
          if (outcome === "dismissed") setDismissed();
        } catch {
          // Ignore: the dialog could not be shown.
        }
      })();
    };

    const removeGestureListeners = () => {
      for (const type of gestureEvents) {
        window.removeEventListener(type, showPrompt);
      }
    };

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      deferredPrompt = event as BeforeInstallPromptEvent;
      for (const type of gestureEvents) {
        window.addEventListener(type, showPrompt, { once: true });
      }
    };

    const handleInstalled = () => {
      deferredPrompt = null;
      removeGestureListeners();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
      removeGestureListeners();
    };
  }, []);

  return null;
}
