"use client";

import { useTranslations } from "next-intl";
import {
  useRoomStore,
  selectConnectedPlayers,
  selectGameInPlay,
} from "@/stores/room";

interface RoomHeaderProps {
  onExitRoom: () => void;
  onPlayGame: () => void;
}

export function RoomHeader({ onExitRoom, onPlayGame }: RoomHeaderProps) {
  const t = useTranslations();
  const roomName = useRoomStore((s) => s.roomData.roomName);
  const connectedPlayers = useRoomStore(selectConnectedPlayers);
  const gameInPlay = useRoomStore(selectGameInPlay);

  return (
    <div className="header flex items-center">
      <div className="w-19/20 mx-auto flex max-w-4xl">
        <div className="flex-none">
          <span className="sr-only">Chinos Game</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="header-content my-[0.3em] w-auto"
            src="/logo2.svg"
            alt="Juego de Los Chinos"
          />
        </div>
        <div className="flex w-full items-center">
          <div className="header-content flex-1 text-center text-white">
            <span className="text-xl">Sala:</span>
            <h2 className="room-title ml-1 inline">{roomName}</h2>
          </div>
          {!gameInPlay && (
            <div id="header-buttons" className="shrink-0 text-center">
              {connectedPlayers > 1 && (
                <button
                  className="header-btn card-btn"
                  type="button"
                  onClick={onPlayGame}
                >
                  {t("button.play")}
                </button>
              )}
              <button
                className="header-btn card-btn ml-2!"
                type="button"
                onClick={onExitRoom}
              >
                {t("button.exit")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
