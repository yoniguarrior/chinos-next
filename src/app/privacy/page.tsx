import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("pages.privacy.title") };
}

export default async function PrivacyPage() {
  const t = await getTranslations();

  return (
    <div className="main-content">
      <h2 className="mt-4 text-center">{t("pages.privacy.title")}</h2>
    </div>
  );
}
