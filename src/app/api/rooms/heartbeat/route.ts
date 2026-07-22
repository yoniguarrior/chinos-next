import { NextResponse } from "next/server";
import { handleApi } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import { setWsCookie } from "@/lib/server/cookies";
import { signWsToken } from "@/lib/server/jwt";
import { getWsDataFromCookie } from "@/lib/server/game";
import { RoomModel } from "@/models/room";

/**
 * Lightweight session keepalive: renews the `ws_chgame` cookie without a full
 * room sync. The WS connection alone cannot Set-Cookie, so idle rooms would
 * otherwise hit `no_joined_room` when the JWT expires (default used to be 30m).
 */
export async function POST(req: Request) {
  return handleApi(req, async () => {
    const cookie = req.headers.get("cookie");
    const wsData = await getWsDataFromCookie(cookie);
    if (!wsData) throw apiError(400, "no_joined_room");

    const room = await RoomModel.findOne({ roomName: wsData.roomName })
      .select("game.players.name")
      .setOptions({ sanitizeFilter: true })
      .lean();

    const stillSeated = room?.game?.players?.some(
      (p) => p.name === wsData.playerName,
    );
    if (!stillSeated) throw apiError(400, "no_joined_room");

    const res = NextResponse.json({ ok: true });
    setWsCookie(res, signWsToken(wsData.playerName, wsData.roomName));
    return res;
  });
}
