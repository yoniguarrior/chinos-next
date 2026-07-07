"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RoomType } from "@/types/enums";

interface RoomTypeFormProps {
  onCloseModal: () => void;
  onSetType: (type: RoomType) => void;
}

export function RoomTypeForm({ onCloseModal, onSetType }: RoomTypeFormProps) {
  const t = useTranslations();

  const [roomType, setRoomType] = useState<RoomType>(RoomType.Public);

  const options = [
    { label: t("room.public"), value: RoomType.Public },
    { label: t("room.private"), value: RoomType.Private },
  ];

  return (
    <>
      <h4 className="mx-4 mt-4 text-center">{t("room.type_select")}</h4>
      <form
        className="card-body"
        onSubmit={(e) => {
          e.preventDefault();
          onSetType(roomType);
        }}
      >
        <div className="relative">
          <select
            className="form-select"
            value={roomType}
            onChange={(e) => setRoomType(e.target.value as RoomType)}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex items-baseline justify-center">
          <button className="card-btn" type="submit">
            {t("button.select")}
          </button>
          <button className="card-btn" type="button" onClick={onCloseModal}>
            {t("button.cancel")}
          </button>
        </div>
      </form>
    </>
  );
}
