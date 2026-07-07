import { NextResponse } from "next/server";
import { handleApi } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import {
  createAccessToken,
  getUserIfRefreshTokenValidates,
} from "@/lib/server/auth";
import { getRefreshCookie } from "@/lib/server/cookies";
import { verifyRefreshToken } from "@/lib/server/jwt";

export async function GET(req: Request) {
  return handleApi(req, async () => {
    const raw = getRefreshCookie(req);
    if (!raw) throw apiError(401, "unauthorized");

    const payload = verifyRefreshToken(raw);
    if (!payload) throw apiError(401, "unauthorized");

    const user = await getUserIfRefreshTokenValidates(req, raw, payload.sub);
    if (!user) throw apiError(401, "unauthorized");

    const authUser = { id: user.id, userName: user.userName };

    return NextResponse.json(
      {
        data: {
          userId: authUser.id,
          userName: authUser.userName,
          accessToken: createAccessToken(authUser),
        },
      },
      { status: 201 },
    );
  });
}
