import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("pages.login.title") };
}

export default async function LoginPage() {
  const t = await getTranslations();

  return (
    <div className="main-content auth-page">
      <h2 className="form-page-title">{t("pages.login.title")}</h2>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
