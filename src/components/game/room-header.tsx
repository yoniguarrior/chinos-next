"use client";

import { useTranslations } from "next-intl";
import {
  useRoomStore,
  selectConnectedPlayers,
  selectGameInPlay,
} from "@/stores/room";
import { GameStatus } from "@/types/enums";

interface RoomHeaderProps {
  onExitRoom: () => void;
  onPlayGame: () => void;
  onNewRound: () => void;
  onExitGame: () => void;
}

export function RoomHeader({
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
      <div className="flex w-full items-center gap-3 px-4">
        <div className="flex-none">
          <span className="sr-only">Chinos Game</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="header-content"
            src="/logo-icon.svg"
            alt="Juego de Los Chinos"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
          <span className="text-[0.6rem] font-semibold tracking-widest text-ch-text-dim uppercase">
            Sala:
          </span>
          <h2 className="room-title font-bold leading-none text-ch-accent">
            {roomName}
          </h2>
        </div>

        <div id="header-buttons" className="flex shrink-0 items-center gap-2">
          {/* Waiting lobby: Jugar (if 2+ players) + Salir */}
          {!gameInPlay && (
            <>
              {connectedPlayers > 1 && (
                <button
                  className="header-btn card-btn card-btn-primary"
                  type="button"
                  onClick={onPlayGame}
                >
                  {t("button.play")}
                </button>
              )}
              <button
                className="header-btn card-btn"
                type="button"
                onClick={onExitRoom}
              >
                {t("button.exit")}
              </button>
            </>
          )}
          {/* End of game round: Nueva partida + Salir */}
          {gameInPlay && isWaitingNewRound && (
            <>
              <button
                className="header-btn card-btn card-btn-primary"
                type="button"
                onClick={onNewRound}
              >
                {t("button.new_round")}
              </button>
              <button
                className="header-btn card-btn"
                type="button"
                onClick={onExitGame}
              >
                {t("button.exit")}
              </button>
            </>
          )}
          {/* During active play: no buttons shown */}
        </div>
      </div>
    </div>
  );
}
