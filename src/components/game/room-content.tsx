"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Share2 } from "lucide-react";
import { leaveRoom } from "@/lib/rooms";
import { setLocalState } from "@/lib/local-state";
import { useErrorStore, errorIsEmpty } from "@/stores/error";
import {
  useRoomStore,
  selectConnectedPlayers,
  selectGameInPlay,
  selectIsReady,
} from "@/stores/room";
import { GameStatus } from "@/types/enums";
import type { IUserAction } from "@/types/game";
import { useGameSocket } from "@/hooks/use-game-socket";
import { BaseModal } from "@/components/base-modal";
import { Loading } from "@/components/loading";
import { ChatBox } from "./chat-box";
import { GameBox } from "./game-box";
import { PlayersInfo } from "./players-info";
import { RoomHeader } from "./room-header";

function resizeGb() {
  const r = document.documentElement;
  if (window.innerWidth > 480) {
    r.style.setProperty("--gb-dim", "48vh");
    r.style.setProperty("--circle-radius", "17vh");
  } else {
    r.style.setProperty("--gb-dim", "96vw");
    r.style.setProperty("--circle-radius", "32vw");
  }
}

export function RoomContent({ roomName }: { roomName: string }) {
  const t = useTranslations();
  const router = useRouter();

  const { connect, close, socketEmit } = useGameSocket();

  const isReady = useRoomStore(selectIsReady);
  const gameInPlay = useRoomStore(selectGameInPlay);
  const connectedPlayers = useRoomStore(selectConnectedPlayers);
  const storeRoomName = useRoomStore((s) => s.roomData.roomName);
  const playerName = useRoomStore((s) => s.playerName);
  const gameStatus = useRoomStore((s) => s.roomData.game.status);

  const errorStatus = useErrorStore((s) => s.status);
  const errorMessage = useErrorStore((s) => s.message);
  const hasError = errorStatus !== "";

  const [copied, setCopied] = useState(false);
  const connectedRef = useRef(false);

  useEffect(() => {
    if (connectedRef.current) return;
    connectedRef.current = true;

    document.documentElement.className = "room";
    window.addEventListener("resize", resizeGb);
    resizeGb();
    connect();

    return () => {
      document.documentElement.className = "";
      window.removeEventListener("resize", resizeGb);
      close();
      connectedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roomSlug = storeRoomName || roomName;

  const appHost =
    process.env.NEXT_PUBLIC_APP_HOST ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const shareUrl = `${appHost}/rooms/join/${encodeURIComponent(roomSlug)}`;

  const copyShareUrl = () => {
    void navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  const exit = async () => {
    await leaveRoom();

    if (!errorIsEmpty(useErrorStore.getState())) {
      console.log("Error exiting room:", useErrorStore.getState().details);
    }

    socketEmit("exitRoom");
    useRoomStore.getState().reset();
    setLocalState({ room: "" });

    router.push("/rooms");
  };

  const play = () => {
    socketEmit("gameStart");
  };

  const handleUserAction = (data: IUserAction) => {
    switch (data.action) {
      case "coins-taken":
        useRoomStore.getState().setOwnCoins(parseInt(data.value));
        socketEmit("coinsTaken", { coins: data.value });
        break;

      case "bet-setted":
        socketEmit("betSetted", { bet: data.value });
        break;

      case "show-coins":
        socketEmit("showCoins");
        break;

      case "close-hand":
        socketEmit("closeHand");
        break;

      case "close-round":
        socketEmit("closeRound");
        break;

      case "select-next":
        socketEmit("selectNext");
        break;

      case "new-round":
        socketEmit("newRound", { playerStart: data.value });
        break;

      case "exit-game":
      case "game-stop":
        if (gameStatus === GameStatus.WaitingNewRound) socketEmit("gameStop");
        break;

      case "message-sent":
        socketEmit("messageSent", { text: data.value });
        break;

      default:
        console.log("Incorrect User action data");
    }
  };

  return (
    <div>
      <RoomHeader onExitRoom={() => void exit()} onPlayGame={play} />
      <PlayersInfo />
      <div className="main-content room-content">
        {hasError ? (
          <div className="error-alert">
            <h4 className="error-text">
              {t(`error.${errorMessage}`, {
                roomName: roomSlug,
                playerName,
              })}
            </h4>
            <p>{t(`error.${errorMessage}_exp`)}</p>
            {errorMessage === "no_joined_room" ? (
              <div className="btn-exit">
                <button className="btn" onClick={() => void exit()}>
                  {t("button.back")}
                </button>
              </div>
            ) : (
              <div className="btn-back">
                <button className="btn" onClick={() => router.back()}>
                  {t("button.back")}
                </button>
              </div>
            )}
          </div>
        ) : isReady ? (
          <div className="play-container">
            {gameInPlay ? (
              <GameBox onUserAction={handleUserAction} />
            ) : (
              <div className="waiting-start px-6 md:px-0">
                {connectedPlayers < 2 ? (
                  <div className="waiting">
                    <h2 className="mt-0!">{t("room.wait_title")}</h2>
                    <p>{t("room.wait_text")}</p>
                  </div>
                ) : connectedPlayers < 5 ? (
                  <div className="enabled">
                    <h2>{t("room.start_title")}</h2>
                    <p>{t("room.start_text")}</p>
                  </div>
                ) : (
                  <div className="closed">
                    <h2>{t("room.maxp_title")}</h2>
                    <p>{t("room.maxp_text")}</p>
                  </div>
                )}
                {connectedPlayers < 5 && (
                  <div className="room-share">
                    <p>{t("text.share_url")}</p>
                    <div className="flex w-full items-center justify-end">
                      {copied && (
                        <div className="text-md mr-3 text-red-700">
                          {t("text.Copied")}
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn min-w-0! w-auto p-0! text-2xl"
                        disabled={copied}
                        title={t("button.copy_to_clipboard")}
                        onClick={copyShareUrl}
                      >
                        <Share2 className="inline h-6 w-6" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <ChatBox onUserAction={handleUserAction} />
          </div>
        ) : (
          <BaseModal>
            <Loading />
          </BaseModal>
        )}
      </div>
    </div>
  );
}
