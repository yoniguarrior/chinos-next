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
    <div className="main-content">
      <div className="mx-auto w-1/3 max-w-36">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo2.svg" alt="Logo Juego de Los Chinos" />
      </div>
      <h3 className="mt-4 mb-2 text-center">{t("pages.home.subtitle")}</h3>
      <h2 className="mb-4 text-center font-semibold text-red-700">
        {t("pages.home.title")}
      </h2>
      <div className="flex items-center justify-center">
        <p className="px-6">
          <Link href="/history">{t("button.origins")}</Link>
        </p>
        <p className="px-6">
          <Link href="/rules">{t("button.rules")}</Link>
        </p>
      </div>
      <hr className="mb-4" />
      <h4>{t("misc.play")}</h4>
      {showGuestHome && <p className="text-justify">{t("pages.home.desc")}</p>}
      <div className="card">
        <div className="card-header">
          {showGuestHome
            ? t("pages.home.play_anonymous")
            : t("pages.home.play_now")}
        </div>
        <div className="card-body">
          <p className="text-justify">{t("pages.home.play")}</p>
          <div className="max-w-82 mx-auto flex items-center justify-between">
            <div>
              <Link className="card-btn" href="/rooms">
                {t("button.see_rooms")}
              </Link>
            </div>
            <div>
              <Link className="card-btn" href="/rooms/create">
                {t("button.new_room")}
              </Link>
            </div>
          </div>
        </div>
      </div>
      {showGuestHome && (
        <div className="card">
          <div className="card-header">{t("pages.home.play_registered")}</div>
          <div className="card-body">
            <p className="text-justify">{t("pages.home.registered")}</p>
            <div className="max-w-82 mx-auto flex items-center justify-between">
              <div>
                <Link className="card-btn" href="/login">
                  {t("button.login")}
                </Link>
              </div>
              <div>
                <Link className="card-btn" href="/register">
                  {t("button.register")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
