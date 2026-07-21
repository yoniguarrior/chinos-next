"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createLoginSch, type LoginType, type Translate } from "@/lib/schemas";
import { useAuthStore } from "@/stores/auth";
import { useErrorStore } from "@/stores/error";
import { BaseModal } from "@/components/base-modal";
import { Loading } from "@/components/loading";
import { PasswordInput } from "@/components/password-input";

export function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const errorDetails = useErrorStore((s) => s.details);

  const schema = useMemo(() => createLoginSch(t as Translate), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginType>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { userName: "", password: "" },
  });

  const [processing, setProcessing] = useState(false);

  const redirectPath = searchParams.get("redirect") ?? "/profile";

  const onSubmit = async (data: LoginType) => {
    setProcessing(true);
    try {
      await login(data);
      router.push(redirectPath);
    } catch {
      // error already recorded in the error store
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="form-panel">
        <form onSubmit={handleSubmit(onSubmit)}>
          {errorDetails && (
            <div className="form-error">{t(`error.${errorDetails}`)}</div>
          )}
          <div className="form-field-v4">
            <label className="form-label-v4" htmlFor="userName">
              {t("form.field.user_name")}
            </label>
            <input
              id="userName"
              type="text"
              autoComplete="username"
              className="form-input"
              {...register("userName")}
            />
            {errors.userName && (
              <p className="form-error-text">{errors.userName.message}</p>
            )}
          </div>
          <div className="form-field-v4">
            <label className="form-label-v4" htmlFor="password">
              {t("form.field.password")}
            </label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              className="form-input"
              {...register("password")}
            />
            {errors.password && (
              <p className="form-error-text">{errors.password.message}</p>
            )}
          </div>
          <div className="auth-actions-row">
            <button
              className="form-submit-btn"
              type="submit"
              disabled={!isValid || processing}
            >
              {t("button.login")}
            </button>
            <Link className="auth-inline-link" href="/forgot-password">
              {t("pages.login.forgotpass")}
            </Link>
          </div>
        </form>
      </div>
      <p className="auth-footer-text">
        {t("pages.login.notregistered")}{" "}
        <Link href="/register" className="auth-footer-link">
          {t("pages.login.register")}
        </Link>
      </p>
      {processing && (
        <BaseModal>
          <Loading />
        </BaseModal>
      )}
    </>
  );
}
