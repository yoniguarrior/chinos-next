"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Grab, Hand, Loader2 } from "lucide-react";
import { useRoomStore } from "@/stores/room";
import { GameStatus, MessageType } from "@/types/enums";
import type { IGameMsg, IBtnMsg, IUserAction, IUserInput } from "@/types/game";
import { GameUserInput } from "./game-user-input";
import { GameUserMsg } from "./game-user-msg";

const MSG_TIMEOUT = 2000;

const ROTATE_NAME = [
  [false, true],
  [false, true, true],
  [false, false, true, true],
  [false, false, true, true, false],
];

export function GameBox({
  onUserAction,
}: {
  onUserAction: (action: IUserAction) => void;
}) {
  const t = useTranslations();

  const roomData = useRoomStore((s) => s.roomData);
  const ownCoins = useRoomStore((s) => s.ownCoins);
  const playerName = useRoomStore((s) => s.playerName);
  const setOwnCoins = useRoomStore((s) => s.setOwnCoins);

  const game = roomData.game;
  const status = game.status;
  const allPlayers = game.players ?? [];
  const gameInPause = game.gameInPause;

  // Names of the players waiting to reconnect, formatted as "a, b y c".
  let reconnNames = "";
  const reconnList = game.usersReconn ?? [];
  reconnList.forEach((name, ix) => {
    if (ix > 0 && ix < reconnList.length - 1) reconnNames += ", ";
    else if (reconnList.length > 1 && ix > 0) reconnNames += " y ";
    reconnNames += name;
  });

  // Players still in the current game (not "saved").
  const activePlayers = allPlayers.filter((p) => !p.saved);
  const activeCount = game.activePlayers || 0;

  // Index (inside inGamePlayers) of the player whose turn it is.
  const turnIndex = (game.inGamePlayers ?? []).findIndex(
    (name) => name === allPlayers[game.playerInTurn]?.name,
  );

  // My index among all players / among active players.
  const myAllIndex = allPlayers.findIndex((p) => p.name === playerName);
  const myActiveIndex = activePlayers.findIndex((p) => p.name === playerName);

  const isMyTurn = game.playerInTurn === myAllIndex;

  // Highest bet I may place: sum of the other players' bets (capped at 3
  // each) plus my own coins.
  let othersBets = 0;
  activePlayers
    .filter((p) => p.name !== playerName)
    .forEach((p) => {
      othersBets += typeof p.bet === "number" && p.bet < 3 ? p.bet : 3;
    });
  const maxBet = othersBets + (ownCoins ?? 0);

  // Rotation offset that keeps the current player at the bottom of the circle.
  const offset = myActiveIndex === -1 ? 0 : myActiveIndex;
  const positions = activePlayers.map(
    (_p, ix) => (activeCount - ix + offset) % activeCount,
  );

  const [showInput, setShowInput] = useState(false);
  const [showMsg, setShowMsg] = useState(false);
  const [gameMsg, setGameMsg] = useState<IGameMsg>({
    text: "",
    type: MessageType.Info,
    timeOut: null,
    buttons: null,
  });
  const [inputData, setInputData] = useState<IUserInput>({
    action: "",
    list: [],
    timeOut: undefined,
  });

  const prevStatusRef = useRef<GameStatus>(GameStatus.WaitingStart);

  /**
   * Rebuilds the message / input UI after a status or players change
   * (port of `updateUi` from the Nuxt GameBox).
   */
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowMsg(false);
    setShowInput(false);

    const msgKey =
      status === GameStatus.FinishHand &&
      (game.winner === null || game.winner === undefined)
        ? "finishHand_nw"
        : status;

    let buttons: IBtnMsg[] | null = null;
    let timeOut: number | null = MSG_TIMEOUT;
    let ix = turnIndex >= 0 ? turnIndex : 0;

    const name =
      status !== GameStatus.WaitingStart
        ? (activePlayers[ix]?.name ?? "")
        : "";

    const list: string[] = [];
    const takenBets: number[] = [];
    let nextInput: IUserInput | null = null;

    switch (status) {
      case GameStatus.TakingCoins:
        for (let d = 0; d <= 3; d++) list.push(d.toString());
        nextInput = { action: "take-coins", list, timeOut: undefined };
        break;

      case GameStatus.Betting:
        allPlayers
          .filter((p) => p.bet !== null && p.bet !== undefined)
          .forEach((p) => takenBets.push(p.bet as number));
        for (let d = ownCoins ?? 0; d <= maxBet; d++)
          if (!takenBets.includes(d)) list.push(d.toString());
        nextInput = { action: "set-bet", list, timeOut: undefined };
        break;

      case GameStatus.Showing:
        nextInput = { action: "show-coins", list: [], timeOut: undefined };
        break;

      case GameStatus.FinishHand: {
        setOwnCoins(null);
        const winnerName = allPlayers[game.winner ?? ix]?.name;
        ix = activePlayers.findIndex((p) => p.name === winnerName);
        if (myActiveIndex === ix)
          buttons = [{ text: t("button.continue"), event: "close-hand" }];
        timeOut = null;
        break;
      }

      case GameStatus.FinishRound: {
        const looserName = allPlayers[game.looser ?? ix]?.name;
        ix = activePlayers.findIndex((p) => p.name === looserName);
        if (myActiveIndex === ix)
          buttons = [{ text: t("button.continue"), event: "close-round" }];
        timeOut = null;
        break;
      }

      case GameStatus.WaitingNewRound:
        ix = 0;
        buttons = [
          { text: t("button.continue"), event: "select-next" },
          { text: t("button.finish"), event: "exit-game" },
        ];
        timeOut = null;
        nextInput = { action: "", list: [], timeOut: undefined };
        break;

      case GameStatus.SelectingNext:
        ix = 0;
        buttons = null;
        timeOut = null;
        allPlayers.forEach((p) => list.push(p.name));
        nextInput = { action: "new-round", list, timeOut: undefined };
        setShowInput(true);
        break;
    }

    if (nextInput) setInputData(nextInput);

    setGameMsg({
      text: t(`game.${msgKey}`, { name, coins: game.totalCoins }),
      type: MessageType.Info,
      timeOut,
      buttons,
    });

    if (status !== prevStatus) setShowMsg(true);
    else setShowInput(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, allPlayers.length, game.playerInTurn, game.winner, game.looser]);

  const angle = (h: number) => ((positions[h] ?? 0) * 360) / (activeCount || 1);

  const playerViewStyle = (h: number): React.CSSProperties => {
    const a = (90 + angle(h)) % 360;
    return {
      transform: `rotate(${a}deg) translate(var(--circle-radius)) rotate(-${a}deg) translate(-50%, -50%) rotate(${angle(h) % 360}deg)`,
    };
  };
  const coinStyle = (h: number): React.CSSProperties => ({
    transform: `translate(-50%, -50%) rotate(-${angle(h) % 360}deg)`,
  });
  const betStyle = (h: number): React.CSSProperties => ({
    transform: `translate(-50%, -25%) rotate(-${angle(h) % 360}deg)`,
  });

  const hiddenPlayers =
    status === GameStatus.FinishRound ||
    status === GameStatus.WaitingNewRound ||
    status === GameStatus.SelectingNext;

  return (
    <>
      <div id="gamebox" className="game-box">
        {gameInPause ? (
          <div className="game-pause card bg-chlight">
            <div className="card-header bg-chmain text-white">
              Juego en pausa
            </div>
            <div className="card-body">
              <p>Esperando reconexión de {reconnNames}</p>
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            </div>
          </div>
        ) : (
          <div className="game-board relative mx-auto">
            <div className="game-container">
              <div className="game-circle" />
              {!hiddenPlayers && (
                <div>
                  {activePlayers.map((player, h) => (
                    <div key={h} className="player-item">
                      <div className="player-view" style={playerViewStyle(h)}>
                        <div className="player-in-turn">
                          {h === turnIndex && (
                            <ChevronRight className="in-turn-flag" />
                          )}
                        </div>
                        {player.lifted ? (
                          <Hand
                            className={`hand-icon open ${h === turnIndex ? "txt-custom" : ""}`}
                          />
                        ) : (
                          <Grab
                            className={`hand-icon closed ${h === turnIndex ? "txt-custom" : ""}`}
                          />
                        )}
                        <h3
                          className={`player-name ${
                            ROTATE_NAME[activeCount - 2]?.[positions[h] ?? 0]
                              ? "rotate"
                              : ""
                          }`}
                        >
                          {player.name === playerName ? "Tu" : player.name}
                        </h3>
                        {((player.name === playerName && ownCoins !== null) ||
                          (player.coins !== null &&
                            player.coins !== undefined &&
                            player.lifted)) && (
                          <div className="player-coins" style={coinStyle(h)}>
                            {player.lifted ? player.coins : ownCoins}
                          </div>
                        )}
                        {player.bet !== null && player.bet !== undefined && (
                          <div className="player-bet" style={betStyle(h)}>
                            {player.bet}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="user-ix-box">
        {showMsg && (!isMyTurn || status !== GameStatus.SelectingNext) && (
          <div id="game-msg">
            <GameUserMsg
              gameMsg={gameMsg}
              onCloseModal={() => setShowMsg(false)}
              onShowInput={() => setShowInput(true)}
              onSetData={onUserAction}
            />
          </div>
        )}
        {showInput &&
          ((isMyTurn && status !== GameStatus.TakingCoins) ||
            (status === GameStatus.TakingCoins &&
              ownCoins === null &&
              myActiveIndex !== -1)) && (
            <div id="actions">
              <GameUserInput
                inputData={inputData}
                onCloseInput={() => setShowInput(false)}
                onSetData={onUserAction}
              />
            </div>
          )}
      </div>
    </>
  );
}
