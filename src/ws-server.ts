import { randomUUID } from "node:crypto";
import type { IncomingMessage, Server as HttpServer } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import { dbConnect } from "./lib/server/db";
import { dispatchGameEvent } from "./lib/server/dispatch-game-event";
import {
  disconnectUser,
  getWsDataFromCookie,
  WsError,
  type IWsData,
} from "./lib/server/game";
import {
  pushToRoom,
  registerWsPeer,
  unregisterWsPeer,
  type WsPeer,
} from "./lib/server/ws-peers";

/**
 * Game WebSocket endpoint attached to the custom Node server (server.js).
 * Replaces the Nitro/crossws handler of the Nuxt version.
 *
 * Protocol (JSON envelopes, both directions): { event: string, data?: any }
 *
 * Auth: the `ws_chgame` HttpOnly cookie (set when joining a room) binds the
 * connection to { playerName, roomName }.
 *
 * Incoming events: sync, gameStart, coinsTaken, betSetted, showCoins,
 *   closeHand, closeRound, selectNext, newRound, gameStop, messageSent,
 *   exitRoom.
 * Outgoing events: syncRes, userSync, gameUpdate, startRes, stopRes,
 *   addMessage, error.
 */

export const WS_PATH = "/api/ws/game";

interface Envelope {
  event: string;
  data?: Record<string, unknown>;
}

function send(socket: WebSocket, event: string, data: unknown): void {
  try {
    socket.send(JSON.stringify({ event, data }));
  } catch {
    // socket may have closed
  }
}

// Enable with WS_DEBUG=1 to log every HTTP upgrade attempt that reaches Node.
// If a browser tries to connect and nothing is logged here, the upgrade is
// being blocked/stripped before Node (Apache proxy mode, or a proxy_pass to a
// port the Passenger-managed app is not actually listening on).
const WS_DEBUG = process.env.WS_DEBUG === "1";

export function attachGameWebSocketServer(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on(
    "upgrade",
    (req: IncomingMessage, socket: Duplex, head: Buffer) => {
      const url = new URL(req.url ?? "/", "http://localhost");

      if (WS_DEBUG) {
        console.log(
          `[ws:upgrade] ${req.method} ${url.pathname}` +
            ` upgrade=${req.headers.upgrade ?? "-"}` +
            ` connection=${req.headers.connection ?? "-"}` +
            ` cookie=${req.headers.cookie ? "yes" : "no"}` +
            ` xff=${req.headers["x-forwarded-for"] ?? "-"}`,
        );
      }

      if (url.pathname !== WS_PATH) {
        // Not ours: let other upgrade listeners (e.g. Next HMR in dev) handle it.
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    },
  );

  wss.on("connection", (socket: WebSocket, req: IncomingMessage) => {
    void handleConnection(socket, req);
  });
}

async function handleConnection(
  socket: WebSocket,
  req: IncomingMessage,
): Promise<void> {
  let wsData: IWsData | null = null;

  try {
    await dbConnect();
    wsData = await getWsDataFromCookie(req.headers.cookie);
  } catch (err) {
    console.error("[ws:game] open error:", err);
  }

  if (!wsData) {
    send(socket, "error", { error: "no_joined_room" });
    socket.close();
    return;
  }

  const data = wsData;
  const peer: WsPeer = {
    id: randomUUID(),
    send: (payload: string) => {
      try {
        socket.send(payload);
      } catch {
        // peer may have disconnected
      }
    },
  };

  registerWsPeer(peer, data.roomName);

  /** Send to every peer in the room, including the sender. */
  const broadcastAll = (event: string, payload: unknown) => {
    send(socket, event, payload);
    pushToRoom(data.roomName, event, payload, peer);
  };

  /** Send only to the other peers in the room. */
  const toOthers = (event: string, payload: unknown) => {
    pushToRoom(data.roomName, event, payload, peer);
  };

  socket.on("message", (raw) => {
    void (async () => {
      let envelope: Envelope;
      try {
        envelope = JSON.parse(raw.toString()) as Envelope;
        if (!envelope || typeof envelope.event !== "string") {
          throw new Error("invalid_message");
        }
      } catch {
        send(socket, "error", { error: "invalid_message" });
        return;
      }

      if (envelope.event === "exitRoom") {
        socket.close();
        return;
      }

      try {
        await dbConnect();
        const result = await dispatchGameEvent(
          envelope.event,
          envelope.data ?? {},
          data,
          peer.id,
        );

        if (result.self) {
          send(socket, result.self.event, result.self.data);
        }
        if (result.broadcast) {
          broadcastAll(result.broadcast.event, result.broadcast.data);
        }
        if (result.others) {
          toOthers(result.others.event, result.others.data);
        }
      } catch (err) {
        const code = err instanceof WsError ? err.code : "server_error";
        if (!(err instanceof WsError)) console.error("[ws:game] error:", err);
        send(socket, "error", { error: code });
      }
    })();
  });

  socket.on("close", () => {
    unregisterWsPeer(peer, data.roomName);

    void (async () => {
      try {
        await dbConnect();
        const result = await disconnectUser(data, false);
        if (result.data) {
          toOthers(result.event, result.data);
        }
      } catch (err) {
        console.error("[ws:game] disconnect error:", err);
      }
    })();
  });

  socket.on("error", (error) => {
    console.error("[ws:game] socket error:", error);
  });
}
