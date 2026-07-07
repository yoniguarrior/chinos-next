"use client";

import { useTranslations } from "next-intl";
import { LogIn } from "lucide-react";
import { RoomStatus, type RoomType } from "@/types/enums";
import type { IRoom } from "@/types/room";

interface RoomsListProps {
  rooms: IRoom[];
  onJoinRoom: (roomName: string, roomType?: RoomType) => void;
}

export function RoomsList({ rooms, onJoinRoom }: RoomsListProps) {
  const t = useTranslations();

  return (
    <div className="list">
      <div className="list-header">
        <div className="list-row cols-3">
          <div className="list-cell first">{t("room.name")}</div>
          <div className="list-cell num-players">{t("room.num_players")}</div>
          <div className="list-cell actions">{t("room.join")}</div>
        </div>
      </div>
      <div className="list-body">
        {rooms.map((room) => (
          <div key={room.roomName} className="list-row cols-3">
            <div className="list-cell first">{room.roomName}</div>
            <div className="list-cell num-players">
              {room.game?.players?.length}
            </div>
            <div className="list-cell actions">
              {room.status === RoomStatus.Open && (
                <button
                  className="btn actions"
                  onClick={() => onJoinRoom(room.roomName, room.roomType)}
                >
                  <LogIn className="inline h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
