"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Translate } from "@/lib/schemas";
import { checkPlayer } from "@/lib/rooms";

interface JoinPublicFormProps {
  roomName: string;
  onCloseModal: () => void;
  onSetPlayer: (playerName: string) => void;
}

export function JoinPublicForm({
  roomName,
  onCloseModal,
  onSetPlayer,
}: JoinPublicFormProps) {
  const t = useTranslations();
  const tr = t as Translate;

  const schema = useMemo(
    () =>
      z.object({
        playerName: z
          .string()
          .nonempty(tr("error.required", { field: t("form.field.player_name") }))
          .regex(/^[\w]+$/)
          .min(3, tr("error.min_chars", { min: 3 }))
          .max(10, tr("error.max_chars", { max: 10 })),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<{ playerName: string }>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { playerName: "" },
  });

  const onSubmit = async (data: { playerName: string }) => {
    const isTaken = await checkPlayer(roomName, data.playerName);

    if (isTaken) {
      alert(t("error.player_name_in_use"));
      return;
    }

    onSetPlayer(data.playerName);
  };

  return (
    <form className="card-body" onSubmit={handleSubmit(onSubmit)}>
      <div className="form-field">
        <input
          type="text"
          placeholder={t("form.field.player_name")}
          className="form-input border border-neutral-300"
          {...register("playerName")}
        />
        {errors.playerName && (
          <p className="mt-1 text-sm text-red-500">
            {errors.playerName.message}
          </p>
        )}
      </div>
      <div className="mt-4 flex items-baseline justify-center">
        <button className="card-btn" type="submit" disabled={!isValid}>
          {t("button.join")}
        </button>
        <button className="card-btn" type="button" onClick={onCloseModal}>
          {t("button.cancel")}
        </button>
      </div>
    </form>
  );
}
