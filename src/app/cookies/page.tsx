import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("pages.cookies.title") };
}

export default async function CookiesPage() {
  const t = await getTranslations();

  return (
    <div className="main-content">
      <h2 className="mt-4 text-center">{t("pages.cookies.title")}</h2>
      <div className="text-justify">
        <h3 className="mt-4 font-semibold">
          {t("pages.cookies.what_are_header")}
        </h3>
        <p>{t("pages.cookies.what_are_text")}</p>
        <h3 className="mt-4 font-semibold">{t("pages.cookies.types_header")}</h3>
        <p>{t("pages.cookies.types_text")}</p>
        <ul className="list-disc pl-8">
          <li>
            <b>{t("pages.cookies.list_technical_header") + ":"}</b>{" "}
            {t("pages.cookies.list_technical_text")}
          </li>
          <li>
            <b>{t("pages.cookies.list_analytics_header") + ":"}</b>{" "}
            {t("pages.cookies.list_analytics_text")}
          </li>
          <li>
            <b>{t("pages.cookies.list_personalization_header") + ":"}</b>{" "}
            {t("pages.cookies.list_personalization_text")}
          </li>
          <li>
            <b>{t("pages.cookies.list_advertising_header") + ":"}</b>{" "}
            {t("pages.cookies.list_advertising_text")}
          </li>
        </ul>
        <h3 className="mt-4 font-semibold">{t("pages.cookies.use_header")}</h3>
        <p>{t("pages.cookies.use_text")}</p>
        <ul className="list-disc pl-8">
          <li>{t("pages.cookies.list_use_1")}</li>
          <li>{t("pages.cookies.list_use_2")}</li>
          <li>{t("pages.cookies.list_use_3")}</li>
        </ul>
        <h3 className="mt-4 font-semibold">
          {t("pages.cookies.management_header")}
        </h3>
        <p>{t("pages.cookies.management_text")}</p>
        <h3 className="mt-4 font-semibold">
          {t("pages.cookies.updates_header")}
        </h3>
        <p>{t("pages.cookies.updates_text")}</p>
      </div>
    </div>
  );
}
