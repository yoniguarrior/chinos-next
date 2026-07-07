"use client";

import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { useRoomStore, selectNumPlayers } from "@/stores/room";
import { GameStatus } from "@/types/enums";

export function PlayersInfo() {
  const t = useTranslations();
  const numPlayers = useRoomStore(selectNumPlayers);
  const players = useRoomStore((s) => s.roomData.game.players);
  const playerName = useRoomStore((s) => s.playerName);
  const gameStarted = useRoomStore(
    (s) => s.roomData.game.status !== GameStatus.WaitingStart,
  );

  return (
    <div className="game-info">
      <div className="players-row">
        <div className="mx-auto flex w-full max-w-4xl items-center">
          <div className="w-14 flex-shrink-0 px-2 text-lg text-gray-600">
            <Users className="inline h-5 w-5" />
          </div>
          {numPlayers === 0 ? (
            <div className="mx-auto">{t("room.no_players")}</div>
          ) : (
            <div className="players-list">
              {players?.map((player) => (
                <div key={player.name} className="pl-connex">
                  <div className={`pl-name ${player.online ? "online" : ""}`}>
                    {player.name === playerName ? "Tu" : player.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {gameStarted && (
        <div className="result-row h-24px w-screen border-b-1 border-gray-300 bg-gray-200">
          <div className="mx-auto flex w-full max-w-4xl items-center">
            <div className="w-14 flex-shrink-0 px-2 text-gray-600">
              <span className="ml-auto">{t("title_lost")}</span>
            </div>
            <div className="lost-list">
              {players?.map((player, ix) => (
                <div key={ix} className="lost-item">
                  <div className="lost-rounds">{player.lostRounds}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
