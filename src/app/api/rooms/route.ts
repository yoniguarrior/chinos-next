import { NextResponse } from "next/server";
import { handleApi, readJsonBody } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import { requireAdmin } from "@/lib/server/auth";
import {
  checkPlayerNameAsUser,
  createRoom,
  findAllRooms,
} from "@/lib/server/rooms";

export async function GET(req: Request) {
  return handleApi(req, async () => {
    await requireAdmin(req);
    return NextResponse.json({ data: await findAllRooms() });
  });
}

export async function POST(req: Request) {
  return handleApi(req, async () => {
    const body = await readJsonBody<{
      roomName?: string;
      playerName?: string;
    }>(req);
    if (!body?.roomName || !body?.playerName) {
      throw apiError(400, "validation");
    }

    if (await checkPlayerNameAsUser(req, body.playerName)) {
      throw apiError(400, "existent_user_not_logged");
    }

    const data = await createRoom({
      roomName: body.roomName,
      roomType: "public",
    });

    return NextResponse.json({ data }, { status: 201 });
  });
}
