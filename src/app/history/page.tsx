import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("pages.history.title") };
}

export default async function HistoryPage() {
  const t = await getTranslations();

  return (
    <div className="main-content">
      <h2 className="content-page-title">{t("pages.history.title")}</h2>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="history-hero"
        src="/origenes_del_juego.jpg"
        alt={t("pages.history.title")}
      />
      <p className="content-body-text text-justify">{t("pages.history.paragraph1")}</p>
      <p className="content-body-text text-justify">{t("pages.history.paragraph2")}</p>
    </div>
  );
}
