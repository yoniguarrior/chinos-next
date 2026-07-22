import { NextResponse } from "next/server";
import { handleApi, readJsonBody } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import {
  checkRoomPassword,
  checkUniquePlayerName,
  checkGuestNameNotInRoomUsers,
  joinRoom,
} from "@/lib/server/rooms";
import { setWsCookie } from "@/lib/server/cookies";

export async function POST(req: Request) {
  return handleApi(req, async () => {
    const body = await readJsonBody<{
      roomName?: string;
      password?: string;
      playerName?: string;
    }>(req);

    if (!body?.roomName || !body?.password || !body?.playerName) {
      throw apiError(400, "validation");
    }

    await checkRoomPassword(body.roomName, body.password);
    await checkGuestNameNotInRoomUsers(body.roomName, body.playerName);
    await checkUniquePlayerName(req, body.roomName, body.playerName);

    const { wsToken, ...data } = await joinRoom(
      req,
      body.roomName,
      body.playerName,
      false,
    );

    const res = NextResponse.json({ data });
    setWsCookie(res, wsToken);
    return res;
  });
}
