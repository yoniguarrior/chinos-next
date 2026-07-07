import { NextResponse } from "next/server";
import { handleApi } from "@/lib/server/handler";
import { requireUser, removeRefreshToken } from "@/lib/server/auth";
import { clearRefreshCookie } from "@/lib/server/cookies";

export async function POST(req: Request) {
  return handleApi(req, async () => {
    const user = requireUser(req);
    await removeRefreshToken(user.id);

    const res = NextResponse.json({ data: "logout ok" });
    clearRefreshCookie(res);
    return res;
  });
}
