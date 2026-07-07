"use client";

import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import type { IURoom } from "@/types/user";

interface UserRoomsListProps {
  rooms: IURoom[];
  owner?: boolean;
  onEditRoom?: (roomName: string) => void;
  onRemoveRoom?: (roomName: string) => void;
}

export function UserRoomsList({
  rooms,
  owner,
  onEditRoom,
  onRemoveRoom,
}: UserRoomsListProps) {
  const t = useTranslations();

  const statusLabel = (room: IURoom) => {
    if (room.status === "closed") return t("room.full");
    if (room.gameStatus === "waitingStart") return t("room.waiting");
    return t("room.playing");
  };

  const isManageable = (room: IURoom) =>
    room.gameStatus === "waitingStart" && room.numPlayers === 0;

  const colsClass = owner ? "cols-1-3" : "cols-1-2";

  return (
    <div className="list">
      <div className="list-header">
        <div className={`list-row ${colsClass}`}>
          <div className="list-cell first">{t("room.name")}</div>
          <div className="list-cell num-players">{t("room.num_players")}</div>
          <div className="list-cell status">{t("room.status")}</div>
          {owner && <div className="list-cell actions">{t("room.actions")}</div>}
        </div>
      </div>
      <div className="list-body">
        {rooms.map((room) => (
          <div key={room.roomName} className={`list-row ${colsClass}`}>
            <div className="list-cell first">{room.roomName}</div>
            <div className="list-cell num-players">{room.numPlayers}</div>
            <div className="list-cell status">{statusLabel(room)}</div>
            {owner && (
              <div className="list-cell actions">
                <button
                  disabled={!isManageable(room)}
                  className="btn actions"
                  title={t("button.edit_room")}
                  onClick={() => onEditRoom?.(room.roomName)}
                >
                  <Pencil className="inline h-5 w-5" />
                </button>
                <button
                  disabled={!isManageable(room)}
                  className="btn actions"
                  title={t("button.delete_room")}
                  onClick={() => onRemoveRoom?.(room.roomName)}
                >
                  <Trash2 className="inline h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
