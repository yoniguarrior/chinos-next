import { NextResponse } from "next/server";
import { handleApi } from "@/lib/server/handler";
import { findPublicRooms } from "@/lib/server/rooms";

export async function GET(req: Request) {
  return handleApi(req, async () => {
    return NextResponse.json({ data: await findPublicRooms() });
  });
}
