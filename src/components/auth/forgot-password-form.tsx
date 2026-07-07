"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createForgotPassSch,
  type ForgotPassType,
  type Translate,
} from "@/lib/schemas";
import { forgotPassword } from "@/lib/user";
import { useErrorStore, errorIsEmpty } from "@/stores/error";
import { BaseModal } from "@/components/base-modal";
import { Loading } from "@/components/loading";

export function ForgotPasswordForm() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorDetails = useErrorStore((s) => s.details);

  const schema = useMemo(() => createForgotPassSch(t as Translate), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ForgotPassType>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { email: "" },
  });

  const [processing, setProcessing] = useState(false);

  const redirectPath = searchParams.get("redirect") ?? "/";

  const onSubmit = async (data: ForgotPassType) => {
    setProcessing(true);
    await forgotPassword(data);

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
            <label
              className="mb-1 block text-sm font-medium text-neutral-700"
              htmlFor="email"
            >
              {t("form.field.email")}
            </label>
            <input
              id="email"
              type="text"
              autoComplete="email"
              placeholder={t("form.placeholder.email")}
              className="form-input border border-neutral-300"
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="mb-2 flex items-center justify-between pt-4">
            <button
              className="card-btn"
              type="submit"
              disabled={!isValid || processing}
            >
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
