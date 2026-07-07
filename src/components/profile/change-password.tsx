"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createChangePassSch,
  type ChangePassType,
  type Translate,
} from "@/lib/schemas";
import { changePassword } from "@/lib/user";
import { useErrorStore, errorIsEmpty } from "@/stores/error";
import { BaseModal } from "@/components/base-modal";
import { Loading } from "@/components/loading";
import { PasswordInput } from "@/components/password-input";

export function ChangePassword({ onCloseModal }: { onCloseModal: () => void }) {
  const t = useTranslations();

  const schema = useMemo(() => createChangePassSch(t as Translate), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ChangePassType>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { oldPassword: "", newPassword: "", confirm: "" },
  });

  const [processing, setProcessing] = useState(false);
  const [alertError, setAlertError] = useState("");

  const onSubmit = async (data: ChangePassType) => {
    setProcessing(true);
    useErrorStore.getState().reset();

    await changePassword({
      oldPassword: data.oldPassword,
      newPassword: data.newPassword,
    });

    const error = useErrorStore.getState();
    if (!errorIsEmpty(error)) setAlertError(error.message);

    setProcessing(false);
    onCloseModal();
  };

  return (
    <>
      <h4 className="mt-4 text-center">{t("profile.changepass")}</h4>
      <form className="card-body" onSubmit={handleSubmit(onSubmit)}>
        {alertError && (
          <div className="form-error">{t(`error.${alertError}`)}</div>
        )}
        <div className="form-field">
          <PasswordInput
            autoComplete="current-password"
            placeholder={t("profile.oldpassword")}
            className="form-input border border-neutral-300 pr-9"
            {...register("oldPassword")}
          />
          {errors.oldPassword && (
            <p className="mt-1 text-sm text-red-500">
              {errors.oldPassword.message}
            </p>
          )}
        </div>
        <div className="form-field">
          <PasswordInput
            autoComplete="new-password"
            placeholder={t("profile.newpassword")}
            className="form-input border border-neutral-300 pr-9"
            {...register("newPassword")}
          />
          {errors.newPassword && (
            <p className="mt-1 text-sm text-red-500">
              {errors.newPassword.message}
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
          <button className="card-btn" type="submit" disabled={!isValid}>
            {t("button.change")}
          </button>
          <button className="card-btn" type="button" onClick={onCloseModal}>
            {t("button.cancel")}
          </button>
        </div>
      </form>

      {processing && (
        <BaseModal>
          <Loading />
        </BaseModal>
      )}
    </>
  );
}
