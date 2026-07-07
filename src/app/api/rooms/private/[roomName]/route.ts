import { NextResponse } from "next/server";
import { handleApi } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import { requireUser } from "@/lib/server/auth";
import { checkRoomUser, joinRoom } from "@/lib/server/rooms";
import { setWsCookie } from "@/lib/server/cookies";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomName: string }> },
) {
  return handleApi(req, async () => {
    const user = requireUser(req);
    const { roomName } = await params;
    if (!roomName) throw apiError(400, "validation");

    if (!(await checkRoomUser(roomName, user.userName))) {
      throw apiError(403, "user_not_registered_in_room");
    }

    const { wsToken, ...data } = await joinRoom(
      req,
      roomName,
      user.userName,
      false,
    );

    const res = NextResponse.json({ data });
    setWsCookie(res, wsToken);
    return res;
  });
}
