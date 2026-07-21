import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { handleApi } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import { setWsCookie } from "@/lib/server/cookies";
import { signWsToken } from "@/lib/server/jwt";
import { getSyncData, getWsDataFromCookie, WsError } from "@/lib/server/game";
import { pushToRoom, roomPeerCount } from "@/lib/server/ws-peers";

/**
 * HTTP fallback for initial room sync when WebSocket frames do not traverse
 * the reverse proxy (nginx → Node). Uses the same logic as the WS `sync`
 * event; socketId is provisional until a real WS sync runs. Also notifies
 * other connected players via WebSocket (`userSync`).
 *
 * Refreshes the ws_chgame cookie so long sessions do not expire mid-game.
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
      // Always notify others so reconnect / online status is shared even with
      // a single other peer (or when HTTP is the only channel briefly).
      if (roomPeerCount(wsData.roomName) >= 1) {
        pushToRoom(wsData.roomName, "userSync", roomData);
      }
      const res = NextResponse.json({ data: result.data });
      setWsCookie(
        res,
        signWsToken(wsData.playerName, wsData.roomName),
      );
      return res;
    } catch (err) {
      if (err instanceof WsError) throw apiError(400, err.code);
      throw err;
    }
  });
}
