import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FistIcon, OpenHandIcon } from "@/components/game/hand-icons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("pages.rules.title") };
}

export default async function RulesPage() {
  const t = await getTranslations();

  return (
    <div className="main-content">
      <h2 className="content-page-title">{t("pages.rules.title")}</h2>

      <div className="rules-icons">
        <div className="rules-icon">
          <FistIcon className="h-8 w-8 text-ch-text-dim" />
        </div>
        <div className="rules-icon highlight">0–3</div>
        <div className="rules-icon">
          <OpenHandIcon className="h-8 w-8 text-ch-text-dim" />
        </div>
      </div>

      <p className="content-body-text text-justify">{t("pages.rules.paragraph1")}</p>
      <p className="content-body-text text-justify">{t("pages.rules.paragraph2")}</p>

      <div className="mt-8 text-center">
        <Link className="rules-cta" href="/rooms">
          {t("button.understood_play")}
        </Link>
      </div>
    </div>
  );
}
