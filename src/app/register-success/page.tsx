import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { RegisterSuccessContent } from "@/components/auth/register-success-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("pages.register_success") };
}

export default async function RegisterSuccessPage() {
  const t = await getTranslations();

  return (
    <div className="main-content">
      <h2 className="mt-4 text-center">{t("pages.register_success")}</h2>
      <Suspense>
        <RegisterSuccessContent />
      </Suspense>
    </div>
  );
}
