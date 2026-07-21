import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RankingContent } from "@/components/ranking/ranking-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("pages.ranking.title") };
}

export default async function RankingPage() {
  const t = await getTranslations();

  return (
    <div className="main-content">
      <h2 className="content-page-title">{t("pages.ranking.title")}</h2>
      <RankingContent />
    </div>
  );
}
