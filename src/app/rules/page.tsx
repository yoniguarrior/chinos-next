import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("pages.rules.title") };
}

export default async function RulesPage() {
  const t = await getTranslations();

  return (
    <div className="main-content">
      <h2 className="mt-4 text-center">{t("pages.rules.title")}</h2>
      <p className="text-justify">{t("pages.rules.paragraph1")}</p>
      <p className="text-justify">{t("pages.rules.paragraph2")}</p>
    </div>
  );
}
