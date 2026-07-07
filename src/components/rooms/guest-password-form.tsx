"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Translate } from "@/lib/schemas";
import { PasswordInput } from "@/components/password-input";

interface GuestPasswordFormProps {
  onCloseModal: () => void;
  onSetData: (password: string) => void;
}

export function GuestPasswordForm({
  onCloseModal,
  onSetData,
}: GuestPasswordFormProps) {
  const t = useTranslations();
  const tr = t as Translate;

  const schema = useMemo(
    () =>
      z.object({
        password: z
          .string()
          .nonempty(tr("error.required", { field: t("form.field.password") }))
          .min(8, tr("error.min_chars", { min: 8 })),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<{ password: string }>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { password: "" },
  });

  const onSubmit = (data: { password: string }) => {
    onSetData(data.password);
  };

  return (
    <div className="main-content">
      <h5 className="mt-4 text-center">{t("pages.guest_join.msg")}</h5>
      <div className="card">
        <form className="card-body" onSubmit={handleSubmit(onSubmit)}>
          <div className="form-field">
            <PasswordInput
              autoComplete="off"
              placeholder={t("create_room.password")}
              className="form-input border border-neutral-300 pr-9"
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="mt-4 flex items-baseline justify-center">
            <button className="card-btn" type="submit" disabled={!isValid}>
              {t("button.send")}
            </button>
            <button className="card-btn" type="button" onClick={onCloseModal}>
              {t("button.cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
