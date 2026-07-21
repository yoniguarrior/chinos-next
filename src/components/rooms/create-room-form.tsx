"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Translate } from "@/lib/schemas";
import { checkUser } from "@/lib/rooms";
import { RoomType } from "@/types/enums";
import { PasswordInput } from "@/components/password-input";

interface CreateRoomFormProps {
  roomType: RoomType;
  playerName: string;
  onCloseModal: () => void;
  onCreateRoom: (
    type: RoomType,
    roomName: string,
    playerName?: string,
    password?: string,
  ) => void;
}

interface CreateRoomFields {
  roomName: string;
  playerName?: string;
  password?: string;
}

export function CreateRoomForm({
  roomType: initialRoomType,
  playerName,
  onCloseModal,
  onCreateRoom,
}: CreateRoomFormProps) {
  const t = useTranslations();
  const tr = t as Translate;

  const [roomType, setRoomType] = useState(initialRoomType);

  const needsPlayerName = roomType === RoomType.Public && playerName === "";
  const isPrivate = roomType === RoomType.Private;

  const schema = useMemo(() => {
    return z.object({
      roomName: z
        .string()
        .nonempty(tr("error.required", { field: t("form.field.room_name") }))
        .min(4, tr("error.min_chars", { min: 4 }))
        .max(20, tr("error.max_chars", { max: 20 })),
      playerName: (needsPlayerName
        ? z
            .string()
            .nonempty(
              tr("error.required", { field: t("form.field.player_name") }),
            )
            .min(3, tr("error.min_chars", { min: 3 }))
            .max(10, tr("error.max_chars", { max: 10 }))
        : z.string()
      ).optional(),
      password: (isPrivate
        ? z
            .string()
            .nonempty(tr("error.required", { field: t("form.field.password") }))
            .min(8, tr("error.min_chars", { min: 8 }))
            .max(1024, tr("error.max_chars", { max: 1024 }))
        : z.string()
      ).optional(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, needsPlayerName, isPrivate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CreateRoomFields>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { roomName: "", playerName, password: "" },
  });

  const onSubmit = async (data: CreateRoomFields) => {
    if (needsPlayerName && data.playerName) {
      const isUser = await checkUser(data.playerName);
      if (isUser) {
        alert(t("error.player_name_in_use"));
        return;
      }
    }

    onCreateRoom(
      roomType,
      data.roomName,
      roomType === RoomType.Public ? (data.playerName ?? playerName) : undefined,
      roomType === RoomType.Private ? data.password : undefined,
    );
  };

  return (
    <div className="create-room-form">
      <h4 className="create-room-title">{t("room.create_data")}</h4>

      <div className="segmented-track">
        <button
          type="button"
          className={roomType === RoomType.Public ? "active" : ""}
          onClick={() => setRoomType(RoomType.Public)}
        >
          {t("room.public")}
        </button>
        <button
          type="button"
          className={roomType === RoomType.Private ? "active" : ""}
          onClick={() => setRoomType(RoomType.Private)}
        >
          {t("room.private")}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-field-v4">
          <label className="form-label-v4" htmlFor="roomName">
            {t("form.field.room_name")}
          </label>
          <input
            id="roomName"
            type="text"
            className="form-input"
            {...register("roomName")}
          />
          {errors.roomName && (
            <p className="form-error-text">{errors.roomName.message}</p>
          )}
        </div>

        {roomType === RoomType.Public && needsPlayerName && (
          <div className="form-field-v4">
            <label className="form-label-v4" htmlFor="playerName">
              {t("form.field.player_name")}
            </label>
            <input
              id="playerName"
              type="text"
              className="form-input"
              {...register("playerName")}
            />
            {errors.playerName && (
              <p className="form-error-text">{errors.playerName.message}</p>
            )}
          </div>
        )}

        {roomType === RoomType.Private && (
          <div className="form-field-v4">
            <label className="form-label-v4" htmlFor="password">
              {t("form.field.password")}
            </label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              className="form-input pr-9"
              {...register("password")}
            />
            {errors.password && (
              <p className="form-error-text">{errors.password.message}</p>
            )}
          </div>
        )}

        <div className="form-actions-row">
          <button className="form-cancel-btn" type="button" onClick={onCloseModal}>
            {t("button.cancel")}
          </button>
          <button className="form-submit-btn" type="submit" disabled={!isValid}>
            {t("button.create")}
          </button>
        </div>
      </form>
    </div>
  );
}
