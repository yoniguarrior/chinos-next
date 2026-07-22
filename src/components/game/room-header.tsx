"use client";

import { useTranslations } from "next-intl";
import {
  useRoomStore,
  selectConnectedPlayers,
  selectGameInPlay,
} from "@/stores/room";
import { GameStatus } from "@/types/enums";

interface RoomHeaderProps {
  hasError?: boolean;
  onExitRoom: () => void;
  onPlayGame: () => void;
  onNewRound: () => void;
  onExitGame: () => void;
}

export function RoomHeader({
  hasError = false,
  onExitRoom,
  onPlayGame,
  onNewRound,
  onExitGame,
}: RoomHeaderProps) {
  const t = useTranslations();
  const roomName = useRoomStore((s) => s.roomData.roomName);
  const connectedPlayers = useRoomStore(selectConnectedPlayers);
  const gameInPlay = useRoomStore(selectGameInPlay);
  const gameStatus = useRoomStore((s) => s.roomData.game.status);

  const isWaitingNewRound = gameStatus === GameStatus.WaitingNewRound;

  return (
    <div className="header flex items-center">
      <div className="flex w-full items-center justify-between gap-3 px-4.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="sr-only">Chinos Game</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="header-content"
            src="/logo-icon.svg"
            alt="Juego de Los Chinos"
          />
          <div className="room-title-line truncate">
            Sala: <span className="room-title-name">{roomName}</span>
          </div>
        </div>

        {!hasError && (
          <div id="header-buttons" className="flex shrink-0 items-center gap-1">
            {/* Waiting lobby: Jugar (outline) + Salir — design 5a */}
            {!gameInPlay && (
              <>
                {connectedPlayers > 1 && (
                  <button
                    className="room-pill px-2!"
                    type="button"
                    onClick={onPlayGame}
                  >
                    {t("button.play")}
                  </button>
                )}
                <button
                  className="room-pill px-2!"
                  type="button"
                  onClick={onExitRoom}
                >
                  {t("button.exit")}
                </button>
              </>
            )}
            {/* End of round / post-reconn: Nueva partida + Salir */}
            {gameInPlay && isWaitingNewRound && (
              <>
                <button
                  className="room-pill px-2!"
                  type="button"
                  onClick={onNewRound}
                >
                  {t("button.new_round")}
                </button>
                <button
                  className="room-pill px-2!"
                  type="button"
                  onClick={onExitGame}
                >
                  {t("button.exit")}
                </button>
              </>
            )}
            {/* Active play: Salir hidden (juego.md §5) */}
          </div>
        )}
      </div>
    </div>
  );
}
