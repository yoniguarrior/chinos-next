"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Translate } from "@/lib/schemas";

interface AddUserFormProps {
  onCloseModal: () => void;
  onAddUser: (userName: string) => void;
}

export function AddUserForm({ onCloseModal, onAddUser }: AddUserFormProps) {
  const t = useTranslations();
  const tr = t as Translate;

  const schema = useMemo(
    () =>
      z.object({
        userName: z
          .string()
          .nonempty(tr("error.required", { field: t("text.user_name") }))
          .min(4, tr("error.min_chars", { min: 4 }))
          .max(20, tr("error.max_chars", { max: 20 })),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<{ userName: string }>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { userName: "" },
  });

  const onSubmit = (data: { userName: string }) => {
    onAddUser(data.userName);
    onCloseModal();
  };

  return (
    <form className="card-body" onSubmit={handleSubmit(onSubmit)}>
      <h3>{t("add_user.title")}</h3>
      <div className="form-field">
        <input
          type="text"
          placeholder={t("text.user_name")}
          className="form-input border border-neutral-300"
          {...register("userName")}
        />
        {errors.userName && (
          <p className="mt-1 text-sm text-red-500">{errors.userName.message}</p>
        )}
      </div>
      <div className="mt-4 flex items-baseline justify-center">
        <button className="card-btn" type="submit" disabled={!isValid}>
          {t("button.add")}
        </button>
        <button className="card-btn" type="button" onClick={onCloseModal}>
          {t("button.cancel")}
        </button>
      </div>
    </form>
  );
}
