import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { HydratedDocument } from "mongoose";
import { handleApi, readJsonBody } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import { dispatchGameEvent } from "@/lib/server/dispatch-game-event";
import {
  getWsDataFromCookie,
  roomToClientPayload,
  type WsResult,
  WsError,
} from "@/lib/server/game";
import type { Room } from "@/models/room";
import { pushToRoom } from "@/lib/server/ws-peers";

type RoomDoc = HydratedDocument<Room>;

function payloadForPush(result: WsResult): unknown {
  if (result.event === "syncRes") {
    return (result.data as { roomData: unknown }).roomData;
  }
  const data = result.data;
  if (data && typeof data === "object" && "roomName" in data) {
    if (typeof (data as RoomDoc).toObject === "function") {
      return roomToClientPayload(data as RoomDoc);
    }
  }
  return data;
}

function pushResult(roomName: string, result: WsResult): void {
  const event = result.event === "syncRes" ? "userSync" : result.event;
  pushToRoom(roomName, event, payloadForPush(result));
}

/**
 * HTTP fallback for game actions when WebSocket client→server frames fail in
 * production. Results are pushed to all room peers via the WS registry.
 */
export async function POST(req: Request) {
  return handleApi(req, async () => {
    const cookie = req.headers.get("cookie");
    const wsData = await getWsDataFromCookie(cookie);
    if (!wsData) throw apiError(400, "no_joined_room");

    const body = await readJsonBody<{
      event?: string;
      data?: Record<string, unknown>;
    }>(req);
    if (!body?.event) throw apiError(400, "validation");

    const socketId = `http-${randomUUID()}`;

    try {
      const result = await dispatchGameEvent(
        body.event,
        body.data ?? {},
        wsData,
        socketId,
      );

      if (result.broadcast) {
        pushResult(wsData.roomName, result.broadcast);
      }
      if (result.self) {
        pushResult(wsData.roomName, result.self);
      }
      if (result.others) {
        pushResult(wsData.roomName, result.others);
      }

      return NextResponse.json({ ok: true });
    } catch (err) {
      if (err instanceof WsError) throw apiError(400, err.code);
      throw err;
    }
  });
}
