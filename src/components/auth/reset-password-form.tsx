"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createResetPassSch,
  type ResetPassType,
  type Translate,
} from "@/lib/schemas";
import { resetPassword, verifyForgotPass } from "@/lib/user";
import { useErrorStore, errorIsEmpty } from "@/stores/error";
import { BaseModal } from "@/components/base-modal";
import { Loading } from "@/components/loading";
import { PasswordInput } from "@/components/password-input";

export function ResetPasswordForm({ uuid }: { uuid: string }) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorDetails = useErrorStore((s) => s.details);

  const schema = useMemo(() => createResetPassSch(t as Translate), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPassType>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { password: "", confirm: "" },
  });

  const [processing, setProcessing] = useState(false);
  const verifiedRef = useRef(false);

  // Validate the reset key on mount (same behaviour as the Nuxt page).
  useEffect(() => {
    if (verifiedRef.current) return;
    verifiedRef.current = true;
    void verifyForgotPass(uuid);
  }, [uuid]);

  const redirectPath = searchParams.get("redirect") ?? "/";

  const onSubmit = async (data: ResetPassType) => {
    setProcessing(true);

    await resetPassword({
      uuid,
      password: data.password,
      confirmPassword: data.confirm,
    });

    if (errorIsEmpty(useErrorStore.getState())) {
      router.push(redirectPath);
    }
    setProcessing(false);
  };

  return (
    <div className="mx-auto w-full max-w-84">
      <div className="card">
        <form className="card-body" onSubmit={handleSubmit(onSubmit)}>
          {errorDetails && (
            <div className="form-error">{t(`error.${errorDetails}`)}</div>
          )}
          <div className="form-field">
            <PasswordInput
              autoComplete="new-password"
              placeholder={t("login.password")}
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
          <div className="mb-2 flex items-center justify-between pt-4">
            <button className="card-btn" type="submit" disabled={processing}>
              {t("button.send")}
            </button>
          </div>
        </form>
      </div>
      {processing && (
        <BaseModal>
          <Loading />
        </BaseModal>
      )}
    </div>
  );
}
