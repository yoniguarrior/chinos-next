"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  const t = useTranslations();

  return (
    <div className="px-4 py-12 text-center text-neutral-700">
      <div className="mb-10">
        <div className="flex flex-col items-center">
          <AlertCircle className="mb-2 h-24 w-24" />
          <p className="text-6xl">Error 404</p>
        </div>
      </div>
      <div className="my-10 text-xl">{t("error.not_found")}</div>
      <div>
        <button className="btn m-3 mt-8 text-sm" onClick={() => router.back()}>
          {t("button.back")}
        </button>
      </div>
    </div>
  );
}
