import { NextResponse } from "next/server";
import { handleApi } from "@/lib/server/handler";
import { leaveRoom } from "@/lib/server/rooms";
import { clearWsCookie } from "@/lib/server/cookies";

export async function POST(req: Request) {
  return handleApi(req, async () => {
    const result = await leaveRoom(req);

    const res = NextResponse.json({
      data: `The player ${result.playerName} left the room ${result.roomName}`,
    });
    clearWsCookie(res);
    return res;
  });
}
