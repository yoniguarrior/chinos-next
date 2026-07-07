"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCreatePrivateSch,
  type CreatePrivateType,
  type Translate,
} from "@/lib/schemas";
import { createPrivateRoom } from "@/lib/rooms";
import { useErrorStore, errorIsEmpty } from "@/stores/error";
import { PasswordInput } from "@/components/password-input";

interface AddRoomFormProps {
  onCloseModal: () => void;
  onRefreshData: () => void;
}

export function AddRoomForm({ onCloseModal, onRefreshData }: AddRoomFormProps) {
  const t = useTranslations();

  const schema = useMemo(
    () => createCreatePrivateSch(t as Translate),
    [t],
  );

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isValid },
  } = useForm<CreatePrivateType>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { roomName: "", password: "" },
  });

  const [showForm, setShowForm] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [alertError, setAlertError] = useState("");

  const onSubmit = async (data: CreatePrivateType) => {
    setProcessing(true);
    useErrorStore.getState().reset();

    await createPrivateRoom(data.roomName, data.password);

    const error = useErrorStore.getState();
    if (errorIsEmpty(error)) {
      setShowForm(false);
      setShowResult(true);
      setTimeout(() => {
        setShowResult(false);
        onRefreshData();
        onCloseModal();
      }, 1800);
    } else {
      setAlertError(error.details || error.message);
    }

    setProcessing(false);
  };

  return (
    <>
      {showForm && (
        <form className="card-body" onSubmit={handleSubmit(onSubmit)}>
          {alertError && (
            <div className="form-error">{t(`error.${alertError}`)}</div>
          )}
          <h3>{t("create_room.title")}</h3>
          <div className="form-field">
            <input
              type="text"
              placeholder={t("room.name")}
              className="form-input border border-neutral-300"
              {...register("roomName")}
            />
            {errors.roomName && (
              <p className="mt-1 text-sm text-red-500">
                {errors.roomName.message}
              </p>
            )}
          </div>
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
          <div className="mt-4 flex items-baseline justify-center">
            <button
              className="card-btn"
              type="submit"
              disabled={!isValid || processing}
            >
              {t("button.create")}
            </button>
            <button className="card-btn" type="button" onClick={onCloseModal}>
              {t("button.cancel")}
            </button>
          </div>
        </form>
      )}
      {showResult && (
        <div className="result-message">
          <h4 className="w-full text-center">
            {t("text.room")} <b>{getValues("roomName")}</b> {t("text.created_l_f")}
          </h4>
        </div>
      )}
    </>
  );
}
