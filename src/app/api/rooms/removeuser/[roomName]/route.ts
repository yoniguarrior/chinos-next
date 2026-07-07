import { NextResponse } from "next/server";
import { handleApi, readJsonBody } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import { requireUser } from "@/lib/server/auth";
import { checkRoomOwner, removeUserFromRoom } from "@/lib/server/rooms";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ roomName: string }> },
) {
  return handleApi(req, async () => {
    const user = requireUser(req);
    const { roomName } = await params;
    if (!roomName) throw apiError(400, "validation");

    if (!(await checkRoomOwner(roomName, user.userName))) {
      throw apiError(403, "not_owner_of_room");
    }

    const body = await readJsonBody<{ userName?: string }>(req);
    if (!body?.userName) throw apiError(400, "validation");

    return NextResponse.json({
      data: await removeUserFromRoom(roomName, body.userName),
    });
  });
}
