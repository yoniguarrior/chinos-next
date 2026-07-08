"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";

/**
 * Restores the "install the app" suggestion that the previous Nuxt app showed
 * via @vite-pwa/nuxt. Captures the browser's `beforeinstallprompt` event and
 * shows a small banner with an install button. The banner is hidden when the
 * app is already installed (standalone) or the user dismissed it.
 */
export function PwaInstallPrompt() {
  const t = useTranslations("pwa");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[9998] mx-auto max-w-md rounded-lg bg-red-700 p-3 text-white shadow-lg">
      <div className="flex items-start gap-3">
        <Download className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <p className="font-semibold">{t("install_title")}</p>
          <p className="mt-0.5 text-sm text-white/90">{t("install_text")}</p>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="rounded px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10"
              onClick={dismiss}
            >
              {t("dismiss")}
            </button>
            <button
              type="button"
              className="rounded bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-white/90"
              onClick={() => void install()}
            >
              {t("install")}
            </button>
          </div>
        </div>
        <button
          type="button"
          className="-mt-1 -mr-1 rounded p-1 text-white/80 hover:bg-white/10"
          aria-label={t("dismiss")}
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
