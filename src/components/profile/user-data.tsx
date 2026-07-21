"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { resendVerifyEmail } from "@/lib/user";
import type { IUser } from "@/types/user";
import { BaseModal } from "@/components/base-modal";
import { Loading } from "@/components/loading";

export function UserData({ user }: { user?: IUser }) {
  const t = useTranslations();

  const [processing, setProcessing] = useState(false);
  const [sent, setSent] = useState(false);

  const handleVerify = async () => {
    setProcessing(true);
    await resendVerifyEmail();
    setProcessing(false);
    setSent(true);
  };

  return (
    <>
      <div className="mx-auto w-full">
        <div className="profile-identity">
          <div className="profile-avatar">
            {user?.userName?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <div className="profile-name">{user?.userName}</div>
            <div className="profile-mail">{user?.email}</div>
          </div>
        </div>

        <div className="profile-verification-wrap">
          {user?.emailVerified ? (
            <span className="verified-badge">
              <Check className="h-4 w-4" aria-hidden />
              {t("profile.email_verified")}
            </span>
          ) : (
            <div className="profile-unverified">
              <div className="profile-unverified-text">
                {t("profile.email_not_verified")}
              </div>
              {!sent ? (
                <button className="profile-pass-btn" type="button" onClick={handleVerify}>
                  {t("button.verify_email")}
                </button>
              ) : (
                <button className="profile-pass-btn" type="button" disabled>
                  {t("button.send_verify")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {processing && (
        <BaseModal>
          <Loading />
        </BaseModal>
      )}
    </>
  );
}
