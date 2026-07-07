"use client";

import { useCallback, useEffect, useRef } from "react";
import { createApi } from "@/lib/api";
import { useErrorStore } from "@/stores/error";
import { useRoomStore, selectIsReady } from "@/stores/room";
import type { IXRoom } from "@/types/room";

/**
 * Game WebSocket client (port of the Nuxt `useGame` composable). Talks to
 * the native `ws` endpoint at `${apiBase}/ws/game` using the JSON envelope
 * protocol; auth is carried by the `ws_chgame` HttpOnly cookie.
 *
 * Falls back to the HTTP endpoints `/rooms/sync` and `/rooms/action` when
 * frames do not flow through a reverse proxy.
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
const MAX_RECONNECT_ATTEMPTS = 5;

export interface GameSocket {
  connect: () => void;
  close: () => void;
  socketEmit: (event: string, payload?: Record<string, unknown>) => void;
}

function buildUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "/api";
  const base = apiBase.startsWith("/") ? apiBase : `/${apiBase}`;
  return `${proto}//${window.location.host}${base}/ws/game`;
}

export function useGameSocket(): GameSocket {
  const wsRef = useRef<WebSocket | null>(null);
  // Allows the onclose handler to schedule a reconnect without referencing
  // `connect` before its declaration.
  const connectRef = useRef<() => void>(() => {});
  const wsSyncedRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncAttemptsRef = useRef(0);
  const reconnectAttemptsRef = useRef(0);
  const manuallyClosedRef = useRef(false);

  const roomIsReady = () => selectIsReady(useRoomStore.getState());

  const stopSyncRetries = useCallback(() => {
    if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    syncTimerRef.current = null;
    syncAttemptsRef.current = 0;
  }, []);

  const applyRoomState = useCallback((data: SyncResData) => {
    const room = useRoomStore.getState();
    if (!room.isJoined) room.setJoined(data.roomData.roomName, data.playerName);
    room.setRoomData(data.roomData);
    room.setPlayerName(data.playerName);
    room.setOwnCoins(data.ownCoins);
    useErrorStore.getState().reset();
  }, []);

  /**
   * HTTP bootstrap for the waiting screen when `syncRes` does not arrive
   * via WS (common behind reverse proxies). Notifies other players
   * server-side.
   */
  const syncViaHttp = useCallback(async () => {
    if (roomIsReady()) return;
    try {
      const { get } = createApi("/rooms/sync");
      const res = await get<{ data: SyncResData }>();
      if (res.data) {
        applyRoomState(res.data);
        stopSyncRetries();
      }
    } catch {
      // WS may still deliver syncRes
    }
  }, [applyRoomState, stopSyncRetries]);

  const emitViaHttp = useCallback(
    async (event: string, payload?: Record<string, unknown>) => {
      try {
        await createApi("/rooms/action").post({ event, data: payload });
        useErrorStore.getState().reset();
      } catch (err: unknown) {
        const code =
          err instanceof Error && err.message ? err.message : "ws_error";
        useErrorStore.getState().setWsError(code);
      }
    },
    [],
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
    if (roomIsReady()) return;

    stopSyncRetries();
    sendSync();

    syncTimerRef.current = setInterval(() => {
      if (wsSyncedRef.current || roomIsReady()) {
        stopSyncRetries();
        return;
      }

      syncAttemptsRef.current += 1;
      if (syncAttemptsRef.current >= MAX_SYNC_ATTEMPTS) {
        stopSyncRetries();
        if (!roomIsReady()) useErrorStore.getState().setWsError("ws_sync_timeout");
        return;
      }

      sendSync();
    }, SYNC_RETRY_MS);
  }, [sendSync, stopSyncRetries]);

  const handleMessage = useCallback(
    (raw: string) => {
      let envelope: Envelope;
      try {
        envelope = JSON.parse(raw) as Envelope;
      } catch {
        return;
      }

      switch (envelope.event) {
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
            useRoomStore.getState().setRoomData(envelope.data as IXRoom);
          }
          useErrorStore.getState().reset();
          break;
        }
        case "error": {
          stopSyncRetries();
          const code =
            (envelope.data as { error?: string })?.error ?? "ws_error";
          useErrorStore.getState().setWsError(code);
          break;
        }
        default:
          console.warn("[useGameSocket] unknown event:", envelope.event);
      }
    },
    [applyRoomState, stopSyncRetries],
  );

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

    manuallyClosedRef.current = false;

    const ws = new WebSocket(buildUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      if (roomIsReady()) return;
      wsSyncedRef.current = false;
      void syncViaHttp();
      startSyncRetries();
    };

    ws.onmessage = (ev) => {
      handleMessage(typeof ev.data === "string" ? ev.data : String(ev.data));
    };

    ws.onerror = () => {
      stopSyncRetries();
      useErrorStore.getState().setWsError("ws_connection_error");
    };

    ws.onclose = () => {
      stopSyncRetries();
      if (
        !manuallyClosedRef.current &&
        reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
      ) {
        reconnectAttemptsRef.current += 1;
        setTimeout(() => {
          if (!manuallyClosedRef.current) connectRef.current();
        }, RECONNECT_DELAY_MS);
      }
    };
  }, [handleMessage, startSyncRetries, stopSyncRetries, syncViaHttp]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const close = useCallback(() => {
    manuallyClosedRef.current = true;
    stopSyncRetries();
    const ws = wsRef.current;
    if (ws) {
      if (wsSyncedRef.current && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: "exitRoom" }));
      }
      ws.close();
      wsRef.current = null;
    }
  }, [stopSyncRetries]);

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

  useEffect(() => stopSyncRetries, [stopSyncRetries]);

  return { connect, close, socketEmit };
}
