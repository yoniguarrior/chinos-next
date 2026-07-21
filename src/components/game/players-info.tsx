"use client";

import { useTranslations } from "next-intl";
import { useRoomStore, selectNumPlayers } from "@/stores/room";

export function PlayersInfo() {
  const t = useTranslations();
  const numPlayers = useRoomStore(selectNumPlayers);
  const players = useRoomStore((s) => s.roomData.game.players);
  const playerName = useRoomStore((s) => s.playerName);
  const lostRoundsSuffix = t("room.lost_rounds_suffix");

  return (
    <div className="game-info">
      <div className="players-row">
        {numPlayers === 0 ? (
          <div className="px-4.5 py-1 text-center text-sm text-ch-text-dim">
            {t("room.no_players")}
          </div>
        ) : (
          <div className="players-list">
            {players?.map((player) => (
              <div
                key={player.name}
                className={`player-chip ${player.online ? "" : "offline"}`}
              >
                <span className="chip-dot" aria-hidden />
                <span className="chip-name">
                  {player.name === playerName ? t("You") : `${player.name}:`}
                  <span className="chip-score">
                    {player.lostRounds ?? 0}
                    {lostRoundsSuffix}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
