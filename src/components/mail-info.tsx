"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";

export function MailInfo({ onClose }: { onClose: () => void }) {
  const t = useTranslations();

  return (
    <div className="card-body">
      <button type="button" className="close-cross-btn" onClick={onClose}>
        <X className="h-6 w-6" aria-hidden="true" />
      </button>
      <div>{t("login.mailinfo1")}</div>
      <div>{t("login.mailinfo2")}</div>
    </div>
  );
}
