"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Translate } from "@/lib/schemas";
import { removeRoom } from "@/lib/rooms";
import { useErrorStore, errorIsEmpty } from "@/stores/error";

interface RemoveRoomFormProps {
  roomName: string;
  onCloseModal: () => void;
  onRefreshData: () => void;
}

export function RemoveRoomForm({
  roomName,
  onCloseModal,
  onRefreshData,
}: RemoveRoomFormProps) {
  const t = useTranslations();

  const schema = useMemo(
    () =>
      z
        .object({ roomConfirm: z.string() })
        .refine((data) => data.roomConfirm === roomName, {
          message: (t as Translate)("error.required", {
            field: t("delete_room.confirm"),
          }),
          path: ["roomConfirm"],
        }),
    [t, roomName],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<{ roomConfirm: string }>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { roomConfirm: "" },
  });

  const [showForm, setShowForm] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [alertError, setAlertError] = useState("");

  const onSubmit = async () => {
    setProcessing(true);
    useErrorStore.getState().reset();

    await removeRoom(roomName);

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
          <p>
            {t("delete_room.confirm-text")} <b>{roomName}</b>
          </p>
          <div className="form-field">
            <input
              type="text"
              placeholder={t("delete_room.confirm_placeholder")}
              className="form-input border border-neutral-300"
              {...register("roomConfirm")}
            />
            {errors.roomConfirm && (
              <p className="mt-1 text-sm text-red-500">
                {errors.roomConfirm.message}
              </p>
            )}
          </div>
          <div className="mt-4 flex items-baseline justify-center">
            <button
              className="card-btn"
              type="submit"
              disabled={!isValid || processing}
            >
              {t("button.delete")}
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
            {t("text.room")} <b>{roomName}</b> {t("text.removed_l_f")}
          </h4>
        </div>
      )}
    </>
  );
}
