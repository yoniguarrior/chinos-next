"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Check, Copy, Loader2 } from "lucide-react"
import { leaveRoom } from "@/lib/rooms"
import { setLocalState } from "@/lib/local-state"
import { useErrorStore, errorIsEmpty } from "@/stores/error"
import {
  useRoomStore,
  selectConnectedPlayers,
  selectGameInPlay,
  selectIsReady,
} from "@/stores/room"
import { GameStatus } from "@/types/enums"
import type { IUserAction } from "@/types/game"
import { useGameSocket } from "@/hooks/use-game-socket"
import { useRoomExitGuard } from "@/hooks/use-room-exit-guard"
import { useWakeLock } from "@/hooks/use-wake-lock"
import { BaseModal } from "@/components/base-modal"
import { Loading } from "@/components/loading"
import { ChatBox } from "./chat-box"
import { GameBox } from "./game-box"
import { PlayersInfo } from "./players-info"
import { RoomHeader } from "./room-header"

function resizeGb() {
  const r = document.documentElement
  if (window.innerWidth > 480) {
    r.style.setProperty("--gb-dim", "48vh")
    r.style.setProperty("--circle-radius", "17vh")
  } else {
    r.style.setProperty("--gb-dim", "96vw")
    r.style.setProperty("--circle-radius", "32vw")
  }
}

export function RoomContent({ roomName }: { roomName: string }) {
  const t = useTranslations()
  const router = useRouter()

  useWakeLock()

  const { connect, close, socketEmit, selfReconnecting, stopSelfReconnect } =
    useGameSocket()

  const isReady = useRoomStore(selectIsReady)
  const gameInPlay = useRoomStore(selectGameInPlay)
  const connectedPlayers = useRoomStore(selectConnectedPlayers)
  const storeRoomName = useRoomStore((s) => s.roomData.roomName)
  const playerName = useRoomStore((s) => s.playerName)
  const gameStatus = useRoomStore((s) => s.roomData.game.status)
  const gameInPause = useRoomStore((s) => s.roomData.game.gameInPause)
  const usersReconn = useRoomStore((s) => s.roomData.game.usersReconn)

  const errorStatus = useErrorStore((s) => s.status)
  const errorMessage = useErrorStore((s) => s.message)
  const hasError = errorStatus !== ""

  const [copied, setCopied] = useState(false)
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false)
  const [exiting, setExiting] = useState(false)
  const connectedRef = useRef(false)
  const exitingViaAppRef = useRef(false)

  useRoomExitGuard({ gameInPlay, exitingViaAppRef })

  useEffect(() => {
    if (connectedRef.current) return
    connectedRef.current = true

    // Add (not replace) the class so the font CSS variables set on <html>
    // by the root layout are preserved.
    document.documentElement.classList.add("room")
    window.addEventListener("resize", resizeGb)
    resizeGb()
    connect()

    return () => {
      document.documentElement.classList.remove("room")
      window.removeEventListener("resize", resizeGb)
      close()
      connectedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Hide the main site header while a game is in play.
  useEffect(() => {
    document.documentElement.classList.toggle("game-playing", gameInPlay)
    return () => document.documentElement.classList.remove("game-playing")
  }, [gameInPlay])

  const roomSlug = storeRoomName || roomName

  const appHost =
    process.env.NEXT_PUBLIC_APP_HOST ??
    (typeof window !== "undefined" ? window.location.origin : "")
  const shareUrl = `${appHost}/rooms/join/${encodeURIComponent(roomSlug)}`

  const copyShareUrl = () => {
    void navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1000)
  }

  /**
   * Teardown after a server-initiated disconnection (session expired, kicked,
   * WS error, etc.).  Fires a best-effort HTTP leave so the server can clean
   * up the DB even when the WS is already closed.  Navigation is not blocked
   * by the API result: errors are swallowed because the session may already be
   * invalid.
   */
  const exitCleanup = () => {
    // Fire-and-forget: don't await so the user navigates immediately.
    // leaveRoom() catches its own errors internally, so this never throws.
    void leaveRoom(false)

    close()
    useRoomStore.getState().reset()
    useErrorStore.getState().reset()
    setLocalState({ room: "" })
    exitingViaAppRef.current = true
    router.push("/rooms")
  }

  const exit = async (abandon = false) => {
    setExiting(true)
    try {
      await leaveRoom(abandon)

      if (!errorIsEmpty(useErrorStore.getState())) {
        console.log("Error exiting room:", useErrorStore.getState().details)
        // API call failed (e.g. session already gone) – fall through to
        // local cleanup so the user can still leave.
      }

      socketEmit("exitRoom")
      close()
      useRoomStore.getState().reset()
      useErrorStore.getState().reset()
      setLocalState({ room: "" })
      exitingViaAppRef.current = true
      router.push("/rooms")
    } finally {
      setExiting(false)
      setShowAbandonConfirm(false)
    }
  }

  const requestExit = () => {
    // Salir in lobby only (mid-game Salir is hidden). waitingNewRound uses stopGame.
    void exit(false)
  }

  const confirmAbandonAndExit = () => {
    void exit(true)
  }

  const abandonSelfReconnect = () => {
    stopSelfReconnect()
    void exit(true)
  }

  const play = () => {
    socketEmit("gameStart")
  }

  const newRound = () => {
    socketEmit("selectNext")
  }

  const stopGame = () => {
    socketEmit("gameStop")
  }

  const retryReconn = () => {
    socketEmit("retryReconn")
  }

  const abandonGame = () => {
    socketEmit("gameAbandon")
  }

  const handleUserAction = (data: IUserAction) => {
    switch (data.action) {
      case "coins-taken":
        useRoomStore.getState().setOwnCoins(parseInt(data.value))
        socketEmit("coinsTaken", { coins: data.value })
        break

      case "bet-setted":
        socketEmit("betSetted", { bet: data.value })
        break

      case "show-coins":
        socketEmit("showCoins")
        break

      case "close-hand":
        socketEmit("closeHand")
        break

      case "close-round":
        socketEmit("closeRound")
        break

      case "select-next":
        socketEmit("selectNext")
        break

      case "new-round":
        socketEmit("newRound", { playerStart: data.value })
        break

      case "exit-game":
      case "game-stop":
        if (gameStatus === GameStatus.WaitingNewRound) socketEmit("gameStop")
        break

      case "message-sent":
        socketEmit("messageSent", { text: data.value })
        break

      default:
        console.log("Incorrect User action data")
    }
  }

  return (
    <div className="room-page">
      <RoomHeader
        hasError={hasError}
        onExitRoom={requestExit}
        onPlayGame={play}
        onNewRound={newRound}
        onExitGame={stopGame}
      />
      <PlayersInfo />
      <div className="main-content room-content">
        {hasError ? (
          <div className="error-alert">
            <h4 className="error-text">
              {t.has(`error.${errorMessage}`)
                ? t(`error.${errorMessage}`, {
                    roomName: roomSlug,
                    playerName,
                  })
                : errorMessage}
            </h4>
            {t.has(`error.${errorMessage}_exp`) ? (
              <p>{t(`error.${errorMessage}_exp`)}</p>
            ) : null}
            <div className="btn-back">
              <button className="btn" onClick={exitCleanup}>
                {t("button.back")}
              </button>
            </div>
          </div>
        ) : isReady ? (
          <>
            <div
              className={`play-container ${gameInPlay ? "playing" : "waiting-room"}`}
            >
              {gameInPlay ? (
                <GameBox
                  onUserAction={handleUserAction}
                  onRetryReconn={retryReconn}
                  onAbandonGame={abandonGame}
                />
              ) : gameInPause ? (
                <div className="game-pause card">
                  <div className="card-header">
                    {t("game.reconn_pause_title")}
                  </div>
                  <div className="card-body text-center">
                    <p>
                      {t("game.reconn_waiting_text", {
                        names: (usersReconn ?? []).join(", "),
                      })}
                    </p>
                    <Loader2 className="mx-auto mt-3 h-8 w-8 animate-spin text-ch-accent" />
                  </div>
                </div>
              ) : (
                <div className="waiting-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="mb-5 h-22 w-22 opacity-90"
                    src="/logo-icon.svg"
                    alt="Juego de Los Chinos"
                  />
                  {connectedPlayers < 2 ? (
                    <div className="waiting">
                      <h2 className="mt-0!">{t("room.wait_title")}</h2>
                      <p className="waiting-text">{t("room.wait_text")}</p>
                    </div>
                  ) : connectedPlayers < 5 ? (
                    <div className="enabled">
                      <h2 className="mt-0!">{t("room.start_title")}</h2>
                      <p className="waiting-text">
                        {t("room.start_text", { count: connectedPlayers })}
                      </p>
                    </div>
                  ) : (
                    <div className="closed">
                      <h2 className="mt-0!">{t("room.maxp_title")}</h2>
                      <p className="waiting-text">{t("room.maxp_text")}</p>
                    </div>
                  )}
                  {connectedPlayers < 5 && (
                    <div className="room-share">
                      <p className="room-share-label">{t("text.share_url")}</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={shareUrl}
                          className="room-share-url"
                        />
                        <button
                          type="button"
                          className="room-share-copy"
                          disabled={copied}
                          title={t("button.copy_to_clipboard")}
                          aria-label={t("button.copy_to_clipboard")}
                          onClick={copyShareUrl}
                        >
                          {copied ? (
                            <Check className="h-4.5 w-4.5" />
                          ) : (
                            <Copy className="h-4.5 w-4.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <BaseModal>
            <Loading />
          </BaseModal>
        )}
      </div>

      <ChatBox onUserAction={handleUserAction} />

      {selfReconnecting && (
        <BaseModal>
          <div className="card-body text-center">
            <h3 className="mb-2 text-lg font-semibold">
              {t("game.self_reconn_title")}
            </h3>
            <p className="mb-4 text-sm text-neutral-600">
              {t("game.self_reconn_text")}
            </p>
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-ch-accent" />
            <button
              type="button"
              className="card-btn"
              onClick={abandonSelfReconnect}
              disabled={exiting}
            >
              {t("game.self_reconn_abandon")}
            </button>
          </div>
        </BaseModal>
      )}

      {showAbandonConfirm && (
        <BaseModal>
          <div className="card-body text-center">
            <h3 className="mb-2 text-lg font-semibold">
              {t("room.abandon_title")}
            </h3>
            <p className="mb-6 text-sm text-neutral-600">
              {t("room.abandon_text")}
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                className="btn"
                onClick={() => setShowAbandonConfirm(false)}
              >
                {t("room.abandon_cancel")}
              </button>
              <button
                type="button"
                className="card-btn"
                onClick={confirmAbandonAndExit}
                disabled={exiting}
              >
                {t("room.abandon_confirm")}
              </button>
            </div>
          </div>
        </BaseModal>
      )}

      {exiting && (
        <BaseModal>
          <Loading />
        </BaseModal>
      )}
    </div>
  )
}
