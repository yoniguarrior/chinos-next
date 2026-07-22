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

  const statusClass = (room: IURoom) => {
    if (room.status === "closed") return "profile-room-status-full";
    if (room.gameStatus === "waitingStart") return "profile-room-status-waiting";
    return "profile-room-status-playing";
  };

  const isManageable = (room: IURoom) =>
    room.gameStatus === "waitingStart" && room.numPlayers === 0;

  return (
    <div className="profile-rooms-panel">
      {rooms.map((room, index) => (
        <div
          key={room.roomName}
          className={`profile-room-row${index === rooms.length - 1 ? " profile-room-row-last" : ""}`}
        >
          <div className="profile-room-main">
            <div className="profile-room-name">{room.roomName}</div>
            <div className="profile-room-meta">
              <span className="profile-room-count">
                {room.numPlayers} {t("room.num_players")}
              </span>
              <span className={`profile-room-status ${statusClass(room)}`}>
                {statusLabel(room)}
              </span>
            </div>
          </div>
          {owner && (
            <div className="profile-room-actions">
              <button
                type="button"
                disabled={!isManageable(room)}
                className="profile-room-action-btn"
                title={t("button.edit_room")}
                onClick={() => onEditRoom?.(room.roomName)}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={!isManageable(room)}
                className="profile-room-action-btn profile-room-action-danger"
                title={t("button.delete_room")}
                onClick={() => onRemoveRoom?.(room.roomName)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
