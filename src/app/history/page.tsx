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
      <h2 className="mt-4 text-center">{t("pages.history.title")}</h2>
      <p className="text-justify">{t("pages.history.paragraph1")}</p>
      <p className="text-justify">{t("pages.history.paragraph2")}</p>
    </div>
  );
}
