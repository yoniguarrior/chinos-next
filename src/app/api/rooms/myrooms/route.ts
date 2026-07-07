import { NextResponse } from "next/server";
import { handleApi } from "@/lib/server/handler";
import { requireUser } from "@/lib/server/auth";
import { findUserRooms } from "@/lib/server/rooms";

export async function GET(req: Request) {
  return handleApi(req, async () => {
    const user = requireUser(req);
    return NextResponse.json({ data: await findUserRooms(user.userName) });
  });
}
