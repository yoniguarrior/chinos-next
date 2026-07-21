"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import {
  createRegisterSch,
  type RegisterType,
  type Translate,
} from "@/lib/schemas";
import { register as registerUser } from "@/lib/user";
import { useErrorStore, errorIsEmpty } from "@/stores/error";
import { BaseModal } from "@/components/base-modal";
import { Loading } from "@/components/loading";
import { MailInfo } from "@/components/mail-info";
import { PasswordInput } from "@/components/password-input";

export function RegisterForm() {
  const t = useTranslations();
  const router = useRouter();

  const schema = useMemo(() => createRegisterSch(t as Translate), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<RegisterType>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { userName: "", email: "", password: "", confirm: "" },
  });

  const [showMailInfo, setShowMailInfo] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [alertError, setAlertError] = useState("");

  const onSubmit = async (data: RegisterType) => {
    setProcessing(true);
    setAlertError("");

    await registerUser({
      userName: data.userName,
      password: data.password,
      email: data.email ? data.email : undefined,
    });

    const error = useErrorStore.getState();
    if (errorIsEmpty(error)) {
      router.push(
        `/register-success?username=${encodeURIComponent(data.userName)}`,
      );
    } else {
      setAlertError(error.details || error.message);
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="form-panel form-panel-stack">
        <form onSubmit={handleSubmit(onSubmit)}>
          {alertError && (
            <div className="form-error">{t(`error.${alertError}`)}</div>
          )}

          <div className="form-field-v4">
            <label className="form-label-v4" htmlFor="userName">
              {t("form.field.user_name")}
            </label>
            <input
              id="userName"
              type="text"
              autoComplete="username"
              placeholder={t("misc.valid_user_name")}
              className="form-input"
              {...register("userName")}
            />
            {errors.userName && (
              <p className="form-error-text">{errors.userName.message}</p>
            )}
          </div>

          <div className="form-field-v4">
            <div className="form-label-row">
              <label className="form-label-v4" htmlFor="email">
                {t("form.field.email")}{" "}
                <span className="form-label-optional">
                  ({t("login.optional")})
                </span>
              </label>
              <button
                type="button"
                className="form-info-btn"
                aria-label={t("register.email_info")}
                onClick={() => setShowMailInfo(true)}
              >
                <Info className="h-3.75 w-3.75" aria-hidden />
              </button>
            </div>
            <input
              id="email"
              type="text"
              autoComplete="email"
              placeholder={t("form.placeholder.email")}
              className="form-input"
              {...register("email")}
            />
            {errors.email && (
              <p className="form-error-text">{errors.email.message}</p>
            )}
          </div>
          {showMailInfo && (
            <BaseModal>
              <MailInfo onClose={() => setShowMailInfo(false)} />
            </BaseModal>
          )}

          <div className="form-field-v4">
            <label className="form-label-v4" htmlFor="password">
              {t("form.field.password")}
            </label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              className="form-input pr-9"
              {...register("password")}
            />
            {errors.password && (
              <p className="form-error-text">{errors.password.message}</p>
            )}
          </div>

          <div className="form-field-v4">
            <label className="form-label-v4" htmlFor="confirm">
              {t("register.confirm")}
            </label>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              className="form-input pr-9"
              {...register("confirm")}
            />
            {errors.confirm && (
              <p className="form-error-text">{errors.confirm.message}</p>
            )}
          </div>

          <div className="form-actions-row form-actions-row-end">
            <button
              className="form-submit-btn"
              type="submit"
              disabled={!isValid}
            >
              {t("button.register")}
            </button>
          </div>
        </form>
      </div>

      <p className="auth-footer-text">
        {t("login.registered")}{" "}
        <Link href="/login" className="auth-footer-link">
          {t("button.login")}
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
