"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { verifyEmail } from "@/lib/user";
import { useAuthStore } from "@/stores/auth";
import { useErrorStore, errorIsEmpty } from "@/stores/error";
import { BaseModal } from "@/components/base-modal";
import { Loading } from "@/components/loading";

export function VerifyEmailContent({ uuid }: { uuid: string }) {
  const t = useTranslations();
  const isLogged = useAuthStore((s) => s.user.userId !== "");

  const [processing, setProcessing] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      await verifyEmail(uuid);
      setEmailVerified(errorIsEmpty(useErrorStore.getState()));
      setProcessing(false);
    })();
  }, [uuid]);

  if (processing) {
    return (
      <BaseModal>
        <Loading />
      </BaseModal>
    );
  }

  return (
    <div className="verified">
      {emailVerified ? (
        <div className="mx-auto my-8 w-11/12 max-w-prose md:w-10/12">
          <p>{t("verify_email.success")}</p>
          <div className="btn-group">
            {!isLogged && (
              <Link className="card-btn" href="/login">
                {t("button.login")}
              </Link>
            )}
            <Link className="card-btn" href="/">
              {t("goto")} {t("button.home")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="mx-auto my-8 w-11/12 max-w-prose md:w-10/12">
          <p>{t("verify_email.error")}</p>
          <p>{t("verify_email.check")}</p>
          <div className="btn-group">
            <Link className="card-btn" href="/profile">
              {t("button.profile")}
            </Link>
            <Link className="card-btn" href="/">
              {t("button.home")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
