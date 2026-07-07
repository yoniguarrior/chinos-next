import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HomeContent } from "@/components/home-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("pages.home.title") };
}

export default function HomePage() {
  return <HomeContent />;
}
