"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { useRoomStore } from "@/stores/room";
import { GameStatus, MessageType } from "@/types/enums";
import type { IGameMsg, IBtnMsg, IUserAction, IUserInput } from "@/types/game";
import { GameUserInput } from "./game-user-input";
import { GameUserMsg } from "./game-user-msg";
import { FistIcon, OpenHandIcon } from "./hand-icons";

const MSG_TIMEOUT = 2000;

export function GameBox({
  onUserAction,
  onRetryReconn,
  onAbandonGame,
}: {
  onUserAction: (action: IUserAction) => void;
  onRetryReconn?: () => void;
  onAbandonGame?: () => void;
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
  const reconnFailed = game.reconnFailed ?? false;

  const reconnList = game.usersReconn ?? [];
  const reconnNames = reconnList.reduce((acc, name, ix) => {
    if (ix === 0) return name;
    if (ix < reconnList.length - 1) return `${acc}, ${name}`;
    return `${acc} ${t("game.reconn_and")} ${name}`;
  }, "");

  const isSelfDisconnected = reconnList.includes(playerName ?? "");
  const isLobbyReconn =
    status === GameStatus.WaitingNewRound ||
    status === GameStatus.WaitingStart;
  const showReconnActions =
    reconnFailed &&
    !isSelfDisconnected &&
    !isLobbyReconn &&
    Boolean(playerName) &&
    Boolean(onRetryReconn) &&
    Boolean(onAbandonGame);

  // Players still in the current game (not "saved").
  const activePlayers = allPlayers.filter((p) => !p.saved);
  const activeCount = game.activePlayers || 0;
  const isWaitingNewRound = status === GameStatus.WaitingNewRound;
  const isSelectingNext = status === GameStatus.SelectingNext;
  // End lobby / who-starts: show everyone in the room, including saved.
  const showFullRoomBoard = isWaitingNewRound || isSelectingNext;
  const boardPlayers = showFullRoomBoard ? allPlayers : activePlayers;
  const boardCount = showFullRoomBoard
    ? allPlayers.length
    : activeCount || activePlayers.length;

  // Index (inside inGamePlayers) of the player whose turn it is.
  const turnIndex = (game.inGamePlayers ?? []).findIndex(
    (name) => name === allPlayers[game.playerInTurn]?.name,
  );

  // My index among all players / among board players.
  const myAllIndex = allPlayers.findIndex((p) => p.name === playerName);
  const myBoardIndex = boardPlayers.findIndex((p) => p.name === playerName);
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
  const offset = myBoardIndex === -1 ? 0 : myBoardIndex;
  const positions = boardPlayers.map(
    (_p, ix) =>
      boardCount > 0 ? (boardCount - ix + offset) % boardCount : 0,
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
        // Simultaneous hide: board center label + compact input prompt only.
        setShowMsg(false);
        setShowInput(true);
        if (nextInput) setInputData(nextInput);
        return;

      case GameStatus.Betting:
        allPlayers
          .filter((p) => p.bet !== null && p.bet !== undefined)
          .forEach((p) => takenBets.push(p.bet as number));
        for (let d = ownCoins ?? 0; d <= maxBet; d++)
          if (!takenBets.includes(d)) list.push(d.toString());
        nextInput = { action: "set-bet", list, timeOut: undefined };
        if (game.playerInTurn === myAllIndex) {
          setShowMsg(false);
          setShowInput(true);
          if (nextInput) setInputData(nextInput);
          return;
        }
        break;

      case GameStatus.Showing:
        nextInput = { action: "show-coins", list: [], timeOut: undefined };
        if (game.playerInTurn === myAllIndex) {
          setShowMsg(false);
          setShowInput(true);
          if (nextInput) setInputData(nextInput);
          return;
        }
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
        // Actions live in the header: [Nueva partida] / [Salir]
        ix = 0;
        buttons = null;
        timeOut = null;
        nextInput = { action: "", list: [], timeOut: undefined };
        setShowMsg(false);
        setShowInput(false);
        return;

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

    const hasWinner =
      status === GameStatus.FinishHand &&
      game.winner !== null &&
      game.winner !== undefined;
    const winnerBet = hasWinner
      ? (allPlayers[game.winner!]?.bet ?? null)
      : null;
    const isSelfWinner =
      hasWinner && allPlayers[game.winner!]?.name === playerName;

    const msgTextKey =
      status === GameStatus.FinishHand && hasWinner && isSelfWinner
        ? "finishHand_self"
        : msgKey;
    const detailKey = isSelfWinner
      ? "finishHand_self_detail"
      : "finishHand_detail";

    setGameMsg({
      text: t(`game.${msgTextKey}`, { name, coins: game.totalCoins }),
      detail:
        hasWinner && winnerBet !== null
          ? t(`game.${detailKey}`, {
              bet: winnerBet,
              coins: game.totalCoins,
            })
          : undefined,
      type: hasWinner ? MessageType.Success : MessageType.Info,
      timeOut,
      buttons,
    });

    if (status !== prevStatus) setShowMsg(true);
    else setShowInput(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, allPlayers.length, game.playerInTurn, game.winner, game.looser]);

  const angle = (h: number) => ((positions[h] ?? 0) * 360) / (boardCount || 1);

  // Seat stays upright: rotate out to the circle edge, then rotate back.
  const playerViewStyle = (h: number): React.CSSProperties => {
    const a = (90 + angle(h)) % 360;
    return {
      transform: `rotate(${a}deg) translate(var(--circle-radius)) rotate(-${a}deg) translate(-50%, -50%)`,
    };
  };

  const hiddenPlayers = status === GameStatus.FinishRound;

  // Center label of the board (design 6–9): status while playing,
  // total on hand result, play-again prompt at end of match (9f).
  const centerLabel =
    status === GameStatus.FinishHand
      ? t("game.center_total", { coins: game.totalCoins })
      : isWaitingNewRound
        ? t("game.center_playAgain")
        : status === GameStatus.TakingCoins ||
            status === GameStatus.Betting ||
            status === GameStatus.Showing
          ? t(`game.center_${status}`)
          : "";

  const winnerName =
    status === GameStatus.FinishHand &&
    game.winner !== null &&
    game.winner !== undefined
      ? allPlayers[game.winner]?.name
      : null;

  const isTaking = status === GameStatus.TakingCoins;
  const isBetting = status === GameStatus.Betting;
  const isShowing = status === GameStatus.Showing;
  const isFinish = status === GameStatus.FinishHand;
  const isEndLobby = showFullRoomBoard;

  return (
    <>
      <div id="gamebox" className="game-box">
        {gameInPause ? (
          <div className="game-pause card">
            <div className="card-header">
              {reconnFailed
                ? t("game.reconn_failed_title")
                : t("game.reconn_pause_title")}
            </div>
            <div className="card-body text-center">
              {reconnFailed && !isLobbyReconn ? (
                <p>{t("game.reconn_failed_text", { names: reconnNames })}</p>
              ) : (
                <>
                  <p>{t("game.reconn_waiting_text", { names: reconnNames })}</p>
                  <Loader2 className="mx-auto mt-3 h-8 w-8 animate-spin text-ch-accent" />
                </>
              )}
              {showReconnActions && (
                <div className="reconn-actions mt-4 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onRetryReconn}
                  >
                    {t("game.reconn_retry")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={onAbandonGame}
                  >
                    {t("game.reconn_abandon")}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            className={`game-board relative mx-auto${isEndLobby ? " game-board-end" : ""}`}
          >
            <div className="game-container">
              <div className="game-circle" />
              {centerLabel && !hiddenPlayers && (
                <div className="game-center-label">{centerLabel}</div>
              )}
              {!hiddenPlayers && (
                <div>
                  {boardPlayers.map((player, h) => {
                    const isWinner = player.name === winnerName;
                    const inTurn =
                      !isEndLobby &&
                      h === turnIndex &&
                      (isBetting || isShowing);
                    const waitingTurn =
                      !isEndLobby && (isBetting || isShowing) && !inTurn;
                    const isSelf = player.name === playerName;

                    // TakingCoins: lifted=false means already hid coins.
                    // Self also tracks via ownCoins before/while sync lands.
                    const coinsChosen = isSelf
                      ? ownCoins !== null || !player.lifted
                      : !player.lifted;

                    const hasRevealed =
                      player.lifted &&
                      player.coins !== null &&
                      player.coins !== undefined;

                    // Design 6a–6c: open hand while still choosing; fist + ✓ when done.
                    // Design 7: fists. Design 8: open after reveal. Design 9: all open.
                    const showOpenHand = isEndLobby
                      ? true
                      : isTaking
                        ? !coinsChosen
                        : (isShowing && hasRevealed) ||
                          (isFinish &&
                            player.coins !== null &&
                            player.coins !== undefined);

                    const showReadyCheck = isTaking && coinsChosen;

                    // Own hidden count: dashed badge until revealed (taking → showing).
                    const showOwnCoins =
                      isSelf &&
                      ownCoins !== null &&
                      coinsChosen &&
                      (isTaking || isBetting || (isShowing && !hasRevealed));

                    // Revealed coins centered so the bet badge can stay top-right.
                    const showRevealedCoins =
                      ((isShowing && hasRevealed) || isFinish) &&
                      player.coins !== null &&
                      player.coins !== undefined;

                    // Bet badge once placed: stays through showing and hand result.
                    const showBetBadge =
                      (isBetting || isShowing || isFinish) &&
                      player.bet !== null &&
                      player.bet !== undefined;

                    return (
                      <div key={player.name} className="player-item">
                        <div
                          className={`player-view${inTurn ? " in-turn" : ""}${
                            waitingTurn ? " waiting-turn" : ""
                          }${isWinner ? " winner" : ""}${isSelf ? " self" : ""}${
                            showReadyCheck ? " ready" : ""
                          }${isEndLobby ? " end-lobby" : ""}`}
                          style={playerViewStyle(h)}
                        >
                          <div className="player-avatar">
                            {showOpenHand ? (
                              <OpenHandIcon className="hand-icon open" />
                            ) : (
                              <FistIcon className="hand-icon closed" />
                            )}
                            {showReadyCheck && (
                              <div
                                className="player-ready"
                                title={t("game.coins_hidden")}
                              >
                                ✓
                              </div>
                            )}
                            {showOwnCoins && (
                              <div
                                className="player-coins"
                                title={t("game.own_coins_hint")}
                              >
                                {ownCoins}
                              </div>
                            )}
                            {showRevealedCoins && (
                              <div className="player-coins revealed">
                                {player.coins}
                              </div>
                            )}
                            {showBetBadge && (
                              <div
                                className={`player-bet ${
                                  isWinner
                                    ? "win"
                                    : isFinish
                                      ? "muted"
                                      : ""
                                }`}
                              >
                                {player.bet}
                              </div>
                            )}
                          </div>
                          <h3 className="player-name">
                            {isSelf ? "Tú" : player.name}
                          </h3>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="user-ix-box">
        {showMsg &&
          status !== GameStatus.WaitingNewRound &&
          (!isMyTurn || status !== GameStatus.SelectingNext) && (
          <div id="game-msg-wrap">
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
                playerName={playerName}
                onCloseInput={() => setShowInput(false)}
                onSetData={onUserAction}
              />
            </div>
          )}
      </div>
    </>
  );
}
