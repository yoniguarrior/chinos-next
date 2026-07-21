"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer w-full flex-none">
      <nav className="footer-links" aria-label={t("menu.footer")}>
        <Link className="footer-link" href="/privacy">
          {t("menu.privacy")}
        </Link>
        <Link className="footer-link" href="/cookies">
          {t("menu.cookies")}
        </Link>
        <Link className="footer-link" href="/legal">
          {t("menu.legal")}
        </Link>
      </nav>
      <p className="footer-copy">
        {t("misc.footer_copyright", { year })}
      </p>
    </footer>
  );
}
