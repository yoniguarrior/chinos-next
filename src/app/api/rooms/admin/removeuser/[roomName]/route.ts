import { NextResponse } from "next/server";
import { handleApi, readJsonBody } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import { requireAdmin } from "@/lib/server/auth";
import { removeUserFromRoom } from "@/lib/server/rooms";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ roomName: string }> },
) {
  return handleApi(req, async () => {
    await requireAdmin(req);
    const { roomName } = await params;
    if (!roomName) throw apiError(400, "validation");

    const body = await readJsonBody<{ userName?: string }>(req);
    if (!body?.userName) throw apiError(400, "validation");

    return NextResponse.json({
      data: await removeUserFromRoom(roomName, body.userName),
    });
  });
}
