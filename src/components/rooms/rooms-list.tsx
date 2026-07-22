"use client";

import { ExternalLink } from "lucide-react";
import type { RoomType } from "@/types/enums";
import type { IRoom } from "@/types/room";

interface RoomsListProps {
  rooms: IRoom[];
  onJoinRoom: (roomName: string, roomType?: RoomType) => void;
}

const MAX_PLAYERS = 5;

export function RoomsList({ rooms, onJoinRoom }: RoomsListProps) {
  return (
    <div className="rooms-panel">
      {rooms.map((room, index) => {
        const playerCount = room.game?.players?.length ?? 0;
        const canJoin = playerCount < MAX_PLAYERS;
        const isLast = index === rooms.length - 1;

        return (
          <div
            key={room.roomName}
            className={`room-row${isLast ? " room-row-last" : ""}`}
          >
            <div className="room-row-name">{room.roomName}</div>
            <div className="room-row-count">
              {playerCount}/{MAX_PLAYERS}
            </div>
            <button
              type="button"
              className="room-join-btn"
              disabled={!canJoin}
              aria-label={room.roomName}
              onClick={() => onJoinRoom(room.roomName, room.roomType)}
            >
              <ExternalLink
                className="h-4 w-4"
                strokeWidth={2.5}
                aria-hidden
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
