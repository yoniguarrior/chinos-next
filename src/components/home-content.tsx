"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/auth";
import { useClientReady } from "@/hooks/use-client-ready";

export function HomeContent() {
  const t = useTranslations();
  const clientReady = useClientReady();
  const isLogged = useAuthStore((s) => s.user.userId !== "");
  const showGuestHome = !clientReady || !isLogged;

  return (
    <div className="main-content home-page">
      <section className="home-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="home-hero-logo"
          src="/logo-icon.svg"
          alt="Logo Juego de Los Chinos"
        />
        <p className="home-kicker">{t("pages.home.subtitle")}</p>
        <h1 className="home-title">{t("pages.home.title")}</h1>
        <div className="home-hero-links">
          <Link className="home-pill" href="/history">
            {t("button.origins")}
          </Link>
          <Link className="home-pill" href="/rules">
            {t("button.rules")}
          </Link>
        </div>
      </section>

      <hr className="home-divider" aria-hidden />

      <div className="home-cards">
        <article className="home-card">
          <h2 className="home-card-title">
            {showGuestHome
              ? t("pages.home.play_anonymous")
              : t("pages.home.play_now")}
          </h2>
          <p className="home-card-desc">{t("pages.home.play")}</p>
          <div className="home-card-actions">
            <Link className="home-outline-btn" href="/rooms">
              {t("button.see_rooms")}
            </Link>
            <Link className="home-outline-btn" href="/rooms/create">
              {t("button.new_room")}
            </Link>
          </div>
        </article>

        {showGuestHome && (
          <article className="home-card">
            <h2 className="home-card-title">
              {t("pages.home.play_registered")}
            </h2>
            <p className="home-card-desc">{t("pages.home.registered")}</p>
            <div className="home-card-actions">
              <Link className="home-outline-btn" href="/login">
                {t("button.login")}
              </Link>
              <Link className="home-outline-btn" href="/register">
                {t("button.register")}
              </Link>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
