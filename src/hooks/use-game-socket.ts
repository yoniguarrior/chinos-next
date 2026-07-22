"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createApi } from "@/lib/api";
import { useErrorStore } from "@/stores/error";
import { useRoomStore, selectIsReady } from "@/stores/room";
import type { IXRoom } from "@/types/room";

/**
 * Game WebSocket client. Talks to `${apiBase}/ws/game` using the JSON envelope
 * protocol; auth is carried by the `ws_chgame` HttpOnly cookie.
 *
 * Falls back to HTTP `/rooms/sync` and `/rooms/action` when needed.
 * Local reconnect UI: retry up to CLIENT_RECONN_MS (600s) with abandon.
 *
 * Disconnect detection:
 * - browser `offline` → show popup and close the socket (peers get disconnectUser)
 * - socket `onclose` → show popup and retry
 * - server protocol heartbeat remains the peer-side safety net
 */

interface Envelope {
  event: string;
  data?: unknown;
}

interface SyncResData {
  roomData: IXRoom;
  playerName: string;
  ownCoins: number | null;
}

const SYNC_RETRY_MS = 750;
const MAX_SYNC_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 2000;
/** Local reconnect budget while showing the self-reconn popup (juego.md). */
export const CLIENT_RECONN_MS = 600_000;
/**
 * Renew `ws_chgame` while the tab stays open. The cookie cannot be refreshed
 * over WebSocket; without this, idle rooms die when the JWT expires.
 */
const COOKIE_REFRESH_MS = 10 * 60 * 1000;

const FATAL_WS_ERRORS = new Set([
  "no_joined_room",
  "non_existing_room",
  "already_disconnected",
  "idle_timeout",
]);

/** Noise / keepalive codes that must not replace the room UI. */
const IGNORED_WS_ERRORS = new Set(["unknown_event"]);

export interface GameSocket {
  connect: () => void;
  close: () => void;
  socketEmit: (event: string, payload?: Record<string, unknown>) => void;
  /** True while the local client is retrying after a socket drop. */
  selfReconnecting: boolean;
  /** Stop retrying (caller should leave the room). */
  stopSelfReconnect: () => void;
}

function buildUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "/api";
  const base = apiBase.startsWith("/") ? apiBase : `/${apiBase}`;
  return `${proto}//${window.location.host}${base}/ws/game`;
}

function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function useGameSocket(): GameSocket {
  const wsRef = useRef<WebSocket | null>(null);
  const connectRef = useRef<() => void>(() => {});
  const wsSyncedRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncAttemptsRef = useRef(0);
  const manuallyClosedRef = useRef(false);
  const fatalErrorRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectStartedAtRef = useRef<number | null>(null);
  const cookieRefreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const [selfReconnecting, setSelfReconnecting] = useState(false);

  const roomIsReady = () => selectIsReady(useRoomStore.getState());

  const stopSyncRetries = useCallback(() => {
    if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    syncTimerRef.current = null;
    syncAttemptsRef.current = 0;
  }, []);

  const stopReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const stopCookieRefresh = useCallback(() => {
    if (cookieRefreshTimerRef.current) {
      clearInterval(cookieRefreshTimerRef.current);
      cookieRefreshTimerRef.current = null;
    }
  }, []);

  const clearSelfReconn = useCallback(() => {
    reconnectStartedAtRef.current = null;
    setSelfReconnecting(false);
    stopReconnect();
  }, [stopReconnect]);

  const markFatal = useCallback(
    (code: string) => {
      fatalErrorRef.current = true;
      manuallyClosedRef.current = true;
      stopSyncRetries();
      stopCookieRefresh();
      clearSelfReconn();
      useErrorStore.getState().setWsError(code);
    },
    [clearSelfReconn, stopCookieRefresh, stopSyncRetries],
  );

  const refreshWsCookie = useCallback(async () => {
    if (fatalErrorRef.current || manuallyClosedRef.current) return;
    if (!wsSyncedRef.current && !roomIsReady()) return;
    try {
      await createApi("/rooms/heartbeat").post({});
    } catch (err: unknown) {
      const code =
        err instanceof Error && err.message ? err.message : "ws_error";
      if (FATAL_WS_ERRORS.has(code)) {
        markFatal(code);
      }
    }
  }, [markFatal]);

  const startCookieRefresh = useCallback(() => {
    stopCookieRefresh();
    cookieRefreshTimerRef.current = setInterval(() => {
      void refreshWsCookie();
    }, COOKIE_REFRESH_MS);
  }, [refreshWsCookie, stopCookieRefresh]);

  const applyRoomState = useCallback(
    (data: SyncResData) => {
      const room = useRoomStore.getState();
      if (!room.isJoined) room.setJoined(data.roomData.roomName, data.playerName);
      room.setRoomData(data.roomData);
      room.setPlayerName(data.playerName);
      room.setOwnCoins(data.ownCoins);
      fatalErrorRef.current = false;
      clearSelfReconn();
      useErrorStore.getState().reset();
    },
    [clearSelfReconn],
  );

  const syncViaHttp = useCallback(
    async (force = false) => {
      if (fatalErrorRef.current) return;
      if (!force && roomIsReady()) return;
      try {
        const { get } = createApi("/rooms/sync");
        const res = await get<{ data: SyncResData }>();
        if (res.data) {
          applyRoomState(res.data);
          stopSyncRetries();
        }
      } catch (err: unknown) {
        const code =
          err instanceof Error && err.message
            ? err.message
            : "ws_connection_error";
        if (FATAL_WS_ERRORS.has(code)) {
          markFatal(code);
          return;
        }
        if (!roomIsReady() && !wsSyncedRef.current) {
          useErrorStore.getState().setWsError(code);
        }
      }
    },
    [applyRoomState, markFatal, stopSyncRetries],
  );

  const emitViaHttp = useCallback(
    async (event: string, payload?: Record<string, unknown>) => {
      try {
        await createApi("/rooms/action").post({ event, data: payload });
        useErrorStore.getState().reset();
      } catch (err: unknown) {
        const code =
          err instanceof Error && err.message ? err.message : "ws_error";
        if (FATAL_WS_ERRORS.has(code)) {
          markFatal(code);
          return;
        }
        useErrorStore.getState().setWsError(code);
      }
    },
    [markFatal],
  );

  const sendRaw = (envelope: Envelope) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(envelope));
      return true;
    }
    return false;
  };

  const sendSync = useCallback(() => {
    sendRaw({ event: "sync" });
  }, []);

  const startSyncRetries = useCallback(() => {
    if (fatalErrorRef.current || roomIsReady()) return;

    stopSyncRetries();
    sendSync();

    syncTimerRef.current = setInterval(() => {
      if (fatalErrorRef.current || wsSyncedRef.current || roomIsReady()) {
        stopSyncRetries();
        return;
      }

      syncAttemptsRef.current += 1;
      if (syncAttemptsRef.current >= MAX_SYNC_ATTEMPTS) {
        stopSyncRetries();
        if (!roomIsReady()) {
          useErrorStore.getState().setWsError("ws_sync_timeout");
        }
        return;
      }

      sendSync();
    }, SYNC_RETRY_MS);
  }, [sendSync, stopSyncRetries]);

  const beginSelfReconn = useCallback(() => {
    if (manuallyClosedRef.current || fatalErrorRef.current) return;
    if (reconnectStartedAtRef.current === null) {
      reconnectStartedAtRef.current = Date.now();
    }
    setSelfReconnecting(true);
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (manuallyClosedRef.current || fatalErrorRef.current) return;

    beginSelfReconn();

    const started = reconnectStartedAtRef.current;
    if (started !== null && Date.now() - started >= CLIENT_RECONN_MS) {
      stopReconnect();
      return;
    }

    if (isBrowserOffline()) {
      stopReconnect();
      return;
    }

    stopReconnect();
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      if (!manuallyClosedRef.current && !fatalErrorRef.current) {
        connectRef.current();
      }
    }, RECONNECT_DELAY_MS);
  }, [beginSelfReconn, stopReconnect]);

  const handleMessage = useCallback(
    (raw: string) => {
      let envelope: Envelope;
      try {
        envelope = JSON.parse(raw) as Envelope;
      } catch {
        return;
      }

      switch (envelope.event) {
        case "pong":
          break;
        case "syncRes": {
          wsSyncedRef.current = true;
          stopSyncRetries();
          applyRoomState(envelope.data as SyncResData);
          break;
        }
        case "userSync":
        case "gameUpdate":
        case "startRes":
        case "stopRes":
        case "addMessage": {
          if (envelope.data) {
            const room = envelope.data as IXRoom;
            const me = useRoomStore.getState().playerName;
            useRoomStore.getState().setRoomData(room);
            // Orderly mid-game idle kick (or peer abandon): seat gone → clean exit UI.
            if (
              me &&
              !manuallyClosedRef.current &&
              !fatalErrorRef.current &&
              Array.isArray(room.game?.players) &&
              !room.game.players.some((p) => p.name === me)
            ) {
              markFatal("idle_timeout");
              break;
            }
          }
          useErrorStore.getState().reset();
          break;
        }
        case "error": {
          const code =
            (envelope.data as { error?: string })?.error ?? "ws_error";
          if (IGNORED_WS_ERRORS.has(code)) break;
          if (FATAL_WS_ERRORS.has(code)) {
            markFatal(code);
            break;
          }
          stopSyncRetries();
          useErrorStore.getState().setWsError(code);
          break;
        }
        default:
          console.warn("[useGameSocket] unknown event:", envelope.event);
      }
    },
    [applyRoomState, markFatal, stopSyncRetries],
  );

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (fatalErrorRef.current) return;
    if (isBrowserOffline()) {
      beginSelfReconn();
      return;
    }
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

    manuallyClosedRef.current = false;

    const ws = new WebSocket(buildUrl());
    wsRef.current = ws;

    if (!roomIsReady()) void syncViaHttp();

    ws.onopen = () => {
      wsSyncedRef.current = false;
      sendSync();
      void syncViaHttp(true);
      startCookieRefresh();
      if (!roomIsReady()) {
        startSyncRetries();
      }
    };

    ws.onmessage = (ev) => {
      handleMessage(typeof ev.data === "string" ? ev.data : String(ev.data));
    };

    ws.onerror = () => {
      stopSyncRetries();
    };

    ws.onclose = () => {
      wsRef.current = null;
      wsSyncedRef.current = false;
      stopSyncRetries();
      stopCookieRefresh();
      scheduleReconnect();
    };
  }, [
    beginSelfReconn,
    handleMessage,
    scheduleReconnect,
    startCookieRefresh,
    startSyncRetries,
    stopCookieRefresh,
    stopSyncRetries,
    syncViaHttp,
  ]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    const onOffline = () => {
      if (manuallyClosedRef.current || fatalErrorRef.current) return;
      // Show self-reconn UI and close the socket so the server marks the player
      // offline (protocol pings can keep a half-open socket looking alive).
      beginSelfReconn();
      stopReconnect();
      const ws = wsRef.current;
      if (ws && ws.readyState <= WebSocket.OPEN) {
        try {
          ws.close();
        } catch {
          wsRef.current = null;
          scheduleReconnect();
        }
      } else {
        scheduleReconnect();
      }
    };

    const onOnline = () => {
      if (manuallyClosedRef.current || fatalErrorRef.current) return;
      const ws = wsRef.current;
      if (!ws || ws.readyState === WebSocket.CLOSED) {
        connectRef.current();
      } else if (ws.readyState === WebSocket.OPEN) {
        sendRaw({ event: "sync" });
        void syncViaHttp(true);
        void refreshWsCookie();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (manuallyClosedRef.current || fatalErrorRef.current) return;
      void refreshWsCookie();
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    beginSelfReconn,
    refreshWsCookie,
    scheduleReconnect,
    stopReconnect,
    syncViaHttp,
  ]);

  const stopSelfReconnect = useCallback(() => {
    manuallyClosedRef.current = true;
    clearSelfReconn();
  }, [clearSelfReconn]);

  const close = useCallback(() => {
    manuallyClosedRef.current = true;
    stopSyncRetries();
    stopCookieRefresh();
    clearSelfReconn();
    const ws = wsRef.current;
    if (ws) {
      if (wsSyncedRef.current && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: "exitRoom" }));
      }
      ws.close();
      wsRef.current = null;
    }
  }, [clearSelfReconn, stopCookieRefresh, stopSyncRetries]);

  const socketEmit = useCallback(
    (event: string, payload?: Record<string, unknown>) => {
      if (wsSyncedRef.current && sendRaw({ event, data: payload })) return;
      if (event === "sync" || event === "exitRoom") {
        sendRaw({ event, data: payload });
        return;
      }
      void emitViaHttp(event, payload);
    },
    [emitViaHttp],
  );

  useEffect(() => {
    return () => {
      stopSyncRetries();
      stopReconnect();
      stopCookieRefresh();
    };
  }, [stopCookieRefresh, stopReconnect, stopSyncRetries]);

  return {
    connect,
    close,
    socketEmit,
    selfReconnecting,
    stopSelfReconnect,
  };
}
