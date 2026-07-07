import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("pages.forgot_pass.title") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations();

  return (
    <div className="main-content">
      <h2 className="mt-4 text-center">{t("pages.forgot_pass.title")}</h2>
      <p>{t("pages.forgot_pass.instructions")}</p>
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
