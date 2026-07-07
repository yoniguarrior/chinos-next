"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/auth";
import { useClientReady } from "@/hooks/use-client-ready";

export function RegisterSuccessContent() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const clientReady = useClientReady();
  const isLogged = useAuthStore((s) => s.user.userId !== "");

  const username = searchParams.get("username") ?? "";

  return (
    <div className="mx-auto my-8 w-11/12 max-w-prose md:w-10/12">
      <p>{t("register.success", { username })}</p>
      <div className="btn-group">
        {clientReady && !isLogged && (
          <Link className="card-btn" href="/login">
            {t("button.login")}
          </Link>
        )}
        <Link className="card-btn" href="/">
          {t("goto")} {t("button.home")}
        </Link>
      </div>
    </div>
  );
}
