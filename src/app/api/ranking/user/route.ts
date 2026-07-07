import { NextResponse } from "next/server";
import { handleApi } from "@/lib/server/handler";
import { requireUser } from "@/lib/server/auth";
import { getUserRanking } from "@/lib/server/ranking";

export async function GET(req: Request) {
  return handleApi(req, async () => {
    const user = requireUser(req);
    return NextResponse.json({ data: await getUserRanking(user.userName) });
  });
}
