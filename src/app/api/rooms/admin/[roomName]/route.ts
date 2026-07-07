import { NextResponse } from "next/server";
import { handleApi, readJsonBody } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import { requireAdmin } from "@/lib/server/auth";
import { deleteRoomByName, updateRoomByName } from "@/lib/server/rooms";

type Params = { params: Promise<{ roomName: string }> };

export async function PATCH(req: Request, { params }: Params) {
  return handleApi(req, async () => {
    await requireAdmin(req);
    const { roomName } = await params;
    if (!roomName) throw apiError(400, "validation");

    const body = await readJsonBody<{
      roomName?: string;
      password?: string;
      users?: string[];
    }>(req);

    const updated = await updateRoomByName(roomName, {
      roomName: body?.roomName,
      password: body?.password,
      users: body?.users,
    });

    return NextResponse.json({ data: updated });
  });
}

export async function DELETE(req: Request, { params }: Params) {
  return handleApi(req, async () => {
    await requireAdmin(req);
    const { roomName } = await params;
    if (!roomName) throw apiError(400, "validation");

    return NextResponse.json({ data: await deleteRoomByName(roomName) });
  });
}
