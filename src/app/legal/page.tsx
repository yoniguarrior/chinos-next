import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("pages.legal.title") };
}

export default async function LegalPage() {
  const t = await getTranslations();

  return (
    <div className="main-content">
      <h2 className="mt-4 text-center">{t("pages.legal.title")}</h2>
    </div>
  );
}
