import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { VerifyEmailContent } from "@/components/auth/verify-email-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("pages.verify_email") };
}

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;
  const t = await getTranslations();

  return (
    <div className="main-content">
      <h2 className="mt-4 text-center">{t("pages.verify_email")}</h2>
      <VerifyEmailContent uuid={uuid} />
    </div>
  );
}
