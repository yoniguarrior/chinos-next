import { NextResponse } from "next/server";
import { handleApi, readJsonBody } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import { requireUser } from "@/lib/server/auth";
import {
  checkRoomOwner,
  checkUniquePlayerName,
  deleteRoomByName,
  findRoom,
  joinRoom,
  updateRoomByName,
} from "@/lib/server/rooms";
import { setWsCookie } from "@/lib/server/cookies";

type Params = { params: Promise<{ roomName: string }> };

/** Owner: room details. */
export async function GET(req: Request, { params }: Params) {
  return handleApi(req, async () => {
    const user = requireUser(req);
    const { roomName } = await params;
    if (!roomName) throw apiError(400, "validation");

    if (!(await checkRoomOwner(roomName, user.userName))) {
      throw apiError(403, "not_owner_of_room");
    }

    return NextResponse.json({ data: await findRoom(roomName) });
  });
}

/** Join a public room. */
export async function POST(req: Request, { params }: Params) {
  return handleApi(req, async () => {
    const { roomName } = await params;
    if (!roomName) throw apiError(400, "validation");

    const body = await readJsonBody<{ playerName?: string }>(req);
    if (!body?.playerName) throw apiError(400, "validation");

    await checkUniquePlayerName(req, roomName, body.playerName);

    const { wsToken, ...data } = await joinRoom(
      req,
      roomName,
      body.playerName,
      true,
    );

    const res = NextResponse.json({ data });
    setWsCookie(res, wsToken);
    return res;
  });
}

/** Owner: update room. */
export async function PATCH(req: Request, { params }: Params) {
  return handleApi(req, async () => {
    const user = requireUser(req);
    const { roomName } = await params;
    if (!roomName) throw apiError(400, "validation");

    if (!(await checkRoomOwner(roomName, user.userName))) {
      throw apiError(403, "not_owner_of_room");
    }

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

/** Owner: delete room. */
export async function DELETE(req: Request, { params }: Params) {
  return handleApi(req, async () => {
    const user = requireUser(req);
    const { roomName } = await params;
    if (!roomName) throw apiError(400, "validation");

    if (!(await checkRoomOwner(roomName, user.userName))) {
      throw apiError(403, "not_owner_of_room");
    }

    return NextResponse.json({ data: await deleteRoomByName(roomName) });
  });
}
