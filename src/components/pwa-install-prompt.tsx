"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BaseModal } from "@/components/base-modal";
import { isMobileDevice, isStandalonePwa } from "@/lib/mobile";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 14;

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until)) return false;
    if (Date.now() > until) {
      localStorage.removeItem(DISMISS_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function setDismissed(): void {
  try {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
  } catch {
    // private mode / blocked storage
  }
}

/**
 * Custom install suggestion (not the auto native dialog on every click).
 * - Chromium/Android: shown when `beforeinstallprompt` is available.
 * - iOS Safari: shown with Add-to-Home-Screen guidance (no native API).
 * Dismiss is stored in localStorage so Cancel sticks across reloads.
 */
export function PwaInstallPrompt() {
  const t = useTranslations();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalonePwa()) return;
    if (isDismissed()) return;

    let cancelled = false;

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      if (cancelled || isDismissed()) return;
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIosHint(false);
      setOpen(true);
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
      setOpen(false);
      setDismissed();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    // iOS never fires beforeinstallprompt — offer a manual tip on mobile only.
    if (isMobileDevice() && isIos()) {
      setIosHint(true);
      setOpen(true);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const dismiss = () => {
    setDismissed();
    setOpen(false);
    setDeferredPrompt(null);
  };

  const install = async () => {
    if (!deferredPrompt) {
      dismiss();
      return;
    }
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "dismissed") {
        setDismissed();
      } else {
        setDismissed();
      }
    } catch {
      setDismissed();
    } finally {
      setDeferredPrompt(null);
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <BaseModal>
      <div className="card-body w-[min(100vw-2rem,24rem)] text-center">
        <h3 className="mb-2 text-lg font-semibold">{t("pwa.install_title")}</h3>
        <p className="mb-6 text-sm text-ch-text-dim">
          {iosHint ? t("pwa.ios_install_text") : t("pwa.install_text")}
        </p>
        <div className="flex justify-center gap-3">
          <button type="button" className="btn" onClick={dismiss}>
            {t("pwa.dismiss")}
          </button>
          {!iosHint && (
            <button type="button" className="card-btn" onClick={() => void install()}>
              {t("pwa.install")}
            </button>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
