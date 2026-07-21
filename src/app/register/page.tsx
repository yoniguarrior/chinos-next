import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RegisterForm } from "@/components/auth/register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("pages.register.title") };
}

export default async function RegisterPage() {
  const t = await getTranslations();

  return (
    <div className="main-content auth-page">
      <h2 className="form-page-title">{t("pages.register.title")}</h2>
      <RegisterForm />
    </div>
  );
}
