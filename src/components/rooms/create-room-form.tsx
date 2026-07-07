"use client";

import { useMemo } from "react";
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
  roomType,
  playerName,
  onCloseModal,
  onCreateRoom,
}: CreateRoomFormProps) {
  const t = useTranslations();
  const tr = t as Translate;

  const needsPlayerName = roomType === RoomType.Public && playerName === "";
  const isPrivate = roomType === RoomType.Private;

  const schema = useMemo(() => {
    return z.object({
      roomName: z
        .string()
        .nonempty(tr("error.required", { field: t("form.field.room_name") }))
        .min(4, tr("error.min_chars", { min: 4 }))
        .max(20, tr("error.max_chars", { max: 20 })),
      // The inputs always submit strings ("" when empty), so the "required"
      // rules still apply; `.optional()` only aligns the inferred type with
      // CreateRoomFields.
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
    // Public guest names must not collide with a registered user.
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
    <>
      <h4 className="mt-4 text-center">{t("room.create_data")}</h4>
      <form className="card-body" onSubmit={handleSubmit(onSubmit)}>
        <div className="form-field">
          <input
            type="text"
            placeholder={t("form.field.room_name")}
            className="form-input border border-neutral-300"
            {...register("roomName")}
          />
          {errors.roomName && (
            <p className="mt-1 text-sm text-red-500">
              {errors.roomName.message}
            </p>
          )}
        </div>

        {roomType === RoomType.Public && (
          <div className="form-field">
            <input
              type="text"
              placeholder={t("form.field.player_name")}
              disabled={playerName !== ""}
              className="form-input border border-neutral-300"
              {...register("playerName")}
            />
            {errors.playerName && (
              <p className="mt-1 text-sm text-red-500">
                {errors.playerName.message}
              </p>
            )}
          </div>
        )}

        {roomType === RoomType.Private && (
          <div className="form-field">
            <PasswordInput
              autoComplete="new-password"
              placeholder={t("form.field.password")}
              className="form-input border border-neutral-300 pr-9"
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex items-baseline justify-center">
          <button className="card-btn" type="submit" disabled={!isValid}>
            {t("button.create")}
          </button>
          <button className="card-btn" type="button" onClick={onCloseModal}>
            {t("button.cancel")}
          </button>
        </div>
      </form>
    </>
  );
}
