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
    <div className="mx-auto w-full max-w-84">
      <div className="card">
        <form className="card-body" onSubmit={handleSubmit(onSubmit)}>
          {errorDetails && (
            <div className="form-error">{t(`error.${errorDetails}`)}</div>
          )}
          <div className="form-field">
            <label
              className="mb-1 block text-sm font-medium text-neutral-700"
              htmlFor="userName"
            >
              {t("form.field.user_name")}
            </label>
            <input
              id="userName"
              type="text"
              autoComplete="username"
              className="form-input border border-neutral-300"
              {...register("userName")}
            />
            {errors.userName && (
              <p className="mt-1 text-sm text-red-500">
                {errors.userName.message}
              </p>
            )}
          </div>
          <div className="form-field">
            <label
              className="mb-1 block text-sm font-medium text-neutral-700"
              htmlFor="password"
            >
              {t("form.field.password")}
            </label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              className="form-input border border-neutral-300"
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="mb-2 flex items-center justify-between pt-4">
            <button
              className="card-btn"
              type="submit"
              disabled={!isValid || processing}
            >
              {t("button.login")}
            </button>
            <Link className="login-link" href="/forgot-password">
              {t("pages.login.forgotpass")}
            </Link>
          </div>
        </form>
      </div>
      <div className="-mt-6 text-center">
        <span className="text-sm text-gray-600">
          {t("pages.login.notregistered")}
        </span>
        <Link href="/register" className="login-link">
          {t("pages.login.register")}
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
