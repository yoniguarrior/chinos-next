import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { handleApi } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import { getSyncData, getWsDataFromCookie, WsError } from "@/lib/server/game";
import { pushToRoom, roomPeerCount } from "@/lib/server/ws-peers";

/**
 * HTTP fallback for initial room sync when WebSocket frames do not traverse
 * the reverse proxy (nginx → Node). Uses the same logic as the WS `sync`
 * event; socketId is provisional until a real WS sync runs. Also notifies
 * other connected players via WebSocket (`userSync`).
 */
export async function GET(req: Request) {
  return handleApi(req, async () => {
    const cookie = req.headers.get("cookie");
    const wsData = await getWsDataFromCookie(cookie);
    if (!wsData) throw apiError(400, "no_joined_room");

    const socketId = `http-${randomUUID()}`;

    try {
      const result = await getSyncData(wsData, socketId);
      const roomData = (result.data as { roomData: unknown }).roomData;
      if (roomPeerCount(wsData.roomName) > 1) {
        pushToRoom(wsData.roomName, "userSync", roomData);
      }
      return NextResponse.json({ data: result.data });
    } catch (err) {
      if (err instanceof WsError) throw apiError(400, err.code);
      throw err;
    }
  });
}
