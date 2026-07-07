import { NextResponse } from "next/server";
import { handleApi } from "@/lib/server/handler";
import { requireUser } from "@/lib/server/auth";
import { getAllUserNames } from "@/lib/server/users";

export async function GET(req: Request) {
  return handleApi(req, async () => {
    requireUser(req);
    return NextResponse.json({ data: await getAllUserNames() });
  });
}
