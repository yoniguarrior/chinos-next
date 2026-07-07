"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

export function Loading() {
  const t = useTranslations();

  return (
    <div className="loading-wrapper">
      <Loader2
        className="loading-item h-12 w-12 animate-spin"
        aria-label="loading"
      />
      <p className="loading-item">{t("misc.processing")}</p>
    </div>
  );
}
