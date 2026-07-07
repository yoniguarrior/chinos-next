"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
      <div className="mx-auto w-full max-w-120">
        <div className="p-3">
          <div className="user-data-row">
            <div className="user-data-label">{t("login.username")}</div>
            <div className="user-data-field">{user?.userName}</div>
          </div>
          <div className="user-data-row">
            <div className="user-data-label">{t("login.email")}</div>
            <div className="user-data-field">{user?.email}</div>
          </div>
          <div className="user-data-row">
            <div className="user-data-label" />
            {user?.emailVerified ? (
              <div className="text-gray-700">{t("profile.email_verified")}</div>
            ) : (
              <div className="flex-grow-1 flex items-center">
                <div className="font-semibold text-gray-700">
                  {t("profile.email_not_verified")}
                </div>
                {!sent ? (
                  <button className="card-btn" type="button" onClick={handleVerify}>
                    {t("button.verify_email")}
                  </button>
                ) : (
                  <button className="card-btn" type="button" disabled>
                    {t("button.send_verify")}
                  </button>
                )}
              </div>
            )}
          </div>
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
