"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/auth";

export default function LogoutPage() {
  const t = useTranslations();
  const router = useRouter();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    useAuthStore
      .getState()
      .logout()
      .catch((e) => console.error("Logout error:", e))
      .finally(() => router.push("/"));
  }, [router]);

  return (
    <div className="main-content">
      <h2>{t("pages.logout.title")}</h2>
    </div>
  );
}
