"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Translate } from "@/lib/schemas";

interface RemoveUserFormProps {
  user: string;
  onCloseModal: () => void;
  onConfirmRemove: (userName: string) => void;
}

export function RemoveUserForm({
  user,
  onCloseModal,
  onConfirmRemove,
}: RemoveUserFormProps) {
  const t = useTranslations();

  const schema = useMemo(
    () =>
      z
        .object({ userConfirm: z.string() })
        .refine((data) => data.userConfirm === user, {
          message: (t as Translate)("error.required", {
            field: t("delete_user.confirm"),
          }),
          path: ["userConfirm"],
        }),
    [t, user],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<{ userConfirm: string }>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { userConfirm: "" },
  });

  const onSubmit = (data: { userConfirm: string }) => {
    onConfirmRemove(data.userConfirm);
    onCloseModal();
  };

  return (
    <form className="card-body" onSubmit={handleSubmit(onSubmit)}>
      <p>
        {t("delete_user.confirm_text", { user })}
      </p>
      <div className="form-field">
        <input
          type="text"
          placeholder={t("delete_user.confirm_placeholder")}
          className="form-input border border-neutral-300"
          {...register("userConfirm")}
        />
        {errors.userConfirm && (
          <p className="mt-1 text-sm text-red-500">
            {errors.userConfirm.message}
          </p>
        )}
      </div>
      <div className="mt-4 flex items-baseline justify-center">
        <button className="card-btn" type="submit" disabled={!isValid}>
          {t("button.delete")}
        </button>
        <button className="card-btn" type="button" onClick={onCloseModal}>
          {t("button.cancel")}
        </button>
      </div>
    </form>
  );
}
