"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { useClientReady } from "@/hooks/use-client-ready";
import { Logo } from "./logo";
import { NavBar, type MenuItem } from "./nav-bar";
import { LanguageSwitcher } from "./language-switcher";

export function SiteHeader() {
  const t = useTranslations();
  const clientReady = useClientReady();
  const isLogged = useAuthStore((s) => s.user.userId !== "");
  const isReady = useAuthStore((s) => s.isReady);

  const [mobMenuOpen, setMobMenuOpen] = useState(false);

  const mainMenuItems: MenuItem[] = [
    { text: t("menu.home"), href: "/" },
    { text: t("menu.rooms"), href: "/rooms" },
    { text: t("menu.history"), href: "/history" },
    { text: t("menu.rules"), href: "/rules" },
    { text: t("menu.ranking"), href: "/ranking" },
  ];

  const userMenuItems: MenuItem[] =
    !clientReady || !isReady
      ? []
      : !isLogged
        ? [
            { text: t("menu.login"), href: "/login" },
            { text: t("menu.register"), href: "/register" },
          ]
        : [
            { text: t("menu.profile"), href: "/profile" },
            { text: t("menu.logout"), href: "/logout" },
          ];

  const closeMobMenu = () => setMobMenuOpen(false);

  return (
    <div className="main-header relative z-50">
      <div className="mx-auto max-w-205 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="shrink-0">
              <Logo src="/logo-icon.svg" alt={t("misc.alt_logo")} className="h-8.5 w-8.5" />
          </div>
          <div className="hidden flex-1 items-baseline justify-center space-x-2 md:flex">
              <NavBar menuItems={mainMenuItems} onNavigate={closeMobMenu} />
          </div>
          <div className="flex items-center justify-end space-x-2">
              <div className="hidden md:flex md:items-baseline md:space-x-2">
                <NavBar menuItems={userMenuItems} onNavigate={closeMobMenu} />
              </div>
              <LanguageSwitcher />
              <button
                type="button"
                className="btn-mob-menu md:hidden"
                aria-controls="mobile-menu"
                aria-expanded={mobMenuOpen}
                onClick={() => setMobMenuOpen((open) => !open)}
              >
                <span className="sr-only">{t("menu.mobile_open")}</span>
                {mobMenuOpen ? (
                  <X className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="h-6 w-6" aria-hidden="true" />
                )}
              </button>
          </div>
        </div>
      </div>
      {mobMenuOpen && (
        <div
          id="mobile-menu"
          className="mobile-menu-panel absolute inset-x-0 top-full z-50 border-b border-ch-accent-dim bg-ch-bg px-4 pb-3 shadow-lg md:hidden"
        >
          <div className="mx-auto flex max-w-205 flex-col space-y-1 pt-2">
            <NavBar menuItems={mainMenuItems} onNavigate={closeMobMenu} vertical />
            <NavBar menuItems={userMenuItems} onNavigate={closeMobMenu} vertical />
          </div>
        </div>
      )}
    </div>
  );
}
