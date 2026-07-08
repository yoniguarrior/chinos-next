"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations();

  return (
    <div className="site-footer w-full flex-none bg-gray-700 pt-3 pb-2">
      <div className="mx-auto mb-2 flex max-w-7xl justify-center">
        <nav className="flex divide-x divide-gray-400 text-gray-400">
          <Link className="footer-menu-item" href="/privacy">
            <span>{t("menu.privacy")}</span>
          </Link>
          <Link className="footer-menu-item" href="/cookies">
            <span>{t("menu.cookies")}</span>
          </Link>
          <Link className="footer-menu-item" href="/legal">
            <span>{t("menu.legal")}</span>
          </Link>
        </nav>
      </div>
      <div className="font-400 mx-auto max-w-7xl text-center text-sm text-white opacity-75">
        &copy; 2021 - Peqherlin
      </div>
    </div>
  );
}
