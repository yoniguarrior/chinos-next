"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import {
  createEditUserSch,
  type EditUserType,
  type Translate,
} from "@/lib/schemas";
import { updateUser } from "@/lib/user";
import { useErrorStore, errorIsEmpty } from "@/stores/error";
import type { IUser } from "@/types/user";
import { BaseModal } from "@/components/base-modal";
import { Loading } from "@/components/loading";
import { MailInfo } from "@/components/mail-info";

interface EditUserProps {
  user?: IUser;
  onCloseEdit: () => void;
}

export function EditUser({ user, onCloseEdit }: EditUserProps) {
  const t = useTranslations();

  const schema = useMemo(() => createEditUserSch(t as Translate), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<EditUserType>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { email: user?.email ?? "" },
  });

  const [showMailInfo, setShowMailInfo] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [alertError, setAlertError] = useState("");

  const onSubmit = async (data: EditUserType) => {
    setProcessing(true);
    useErrorStore.getState().reset();

    await updateUser(data.email);

    const error = useErrorStore.getState();
    if (errorIsEmpty(error)) {
      setShowResult(true);
      setTimeout(() => {
        setShowResult(false);
        onCloseEdit();
      }, 1800);
    } else {
      setAlertError(error.details || error.message);
    }

    setProcessing(false);
  };

  return (
    <>
      <h4 className="mt-4 text-center">{t("profile.update")}</h4>
      <div className="mx-auto w-full max-w-88">
        <div className="card">
          <form className="card-body" onSubmit={handleSubmit(onSubmit)}>
            {alertError && (
              <div className="form-error">{t(`error.${alertError}`)}</div>
            )}
            <div className="form-field relative">
              <input
                type="text"
                autoComplete="email"
                placeholder={t("login.email")}
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
            <div className="mb-2 flex items-center justify-between pt-4">
              <button className="card-btn" type="submit" disabled={!isValid}>
                {t("button.save")}
              </button>
              <button className="card-btn" type="button" onClick={onCloseEdit}>
                {t("button.cancel")}
              </button>
            </div>
          </form>
        </div>

        {showResult && (
          <BaseModal>
            <h4 className="w-full text-center">
              {t("text.user")} <b>{user?.userName ?? ""}</b> {t("text.updated")}
            </h4>
          </BaseModal>
        )}
      </div>

      {processing && (
        <BaseModal>
          <Loading />
        </BaseModal>
      )}
    </>
  );
}
