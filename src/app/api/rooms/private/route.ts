import { NextResponse } from "next/server";
import { handleApi, readJsonBody } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import { requireUser } from "@/lib/server/auth";
import { createRoom } from "@/lib/server/rooms";

export async function POST(req: Request) {
  return handleApi(req, async () => {
    const user = requireUser(req);
    const body = await readJsonBody<{ roomName?: string; password?: string }>(
      req,
    );
    if (!body?.roomName || !body?.password) {
      throw apiError(400, "validation");
    }

    const data = await createRoom({
      roomName: body.roomName,
      roomType: "private",
      owner: user.userName,
      password: body.password,
      users: [user.userName],
    });

    return NextResponse.json({ data }, { status: 201 });
  });
}
