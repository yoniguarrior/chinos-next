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
    <div className="mx-auto w-full max-w-88">
      <div className="card">
        <form className="card-body" onSubmit={handleSubmit(onSubmit)}>
          {alertError && (
            <div className="form-error">{t(`error.${alertError}`)}</div>
          )}

          <div className="form-field">
            <input
              type="text"
              autoComplete="username"
              placeholder={t("form.field.user_name")}
              className="form-input border border-neutral-300"
              {...register("userName")}
            />
            {errors.userName && (
              <p className="mt-1 text-sm text-red-500">
                {errors.userName.message}
              </p>
            )}
          </div>

          <div className="form-field relative">
            <input
              type="text"
              autoComplete="email"
              placeholder={t("form.field.email")}
              className="form-input border border-neutral-300 pr-9"
              {...register("email")}
            />
            <button
              type="button"
              className="icon-btn absolute top-1/2 right-2 -translate-y-1/2"
              onClick={() => setShowMailInfo(true)}
            >
              <Info className="h-5 w-5" />
            </button>
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>
          {showMailInfo && (
            <BaseModal>
              <MailInfo onClose={() => setShowMailInfo(false)} />
            </BaseModal>
          )}

          <div className="form-field">
            <PasswordInput
              autoComplete="new-password"
              placeholder={t("form.field.password")}
              className="form-input border border-neutral-300 pr-9"
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="form-field">
            <PasswordInput
              autoComplete="new-password"
              placeholder={t("register.confirm")}
              className="form-input border border-neutral-300 pr-9"
              {...register("confirm")}
            />
            {errors.confirm && (
              <p className="mt-1 text-sm text-red-500">
                {errors.confirm.message}
              </p>
            )}
          </div>

          <div className="mb-2 flex flex-row-reverse items-center pt-4">
            <button className="card-btn" type="submit" disabled={!isValid}>
              {t("button.register")}
            </button>
          </div>
        </form>
      </div>

      <div className="-mt-6 text-center">
        <span className="text-sm text-gray-600">{t("login.registered")}</span>
        <Link href="/login" className="login-link">
          {t("button.login")}
        </Link>
      </div>

      {processing && (
        <BaseModal>
          <Loading />
        </BaseModal>
      )}
    </div>
  );
}
