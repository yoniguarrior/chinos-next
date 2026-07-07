import { NextResponse } from "next/server";
import { handleApi, readJsonBody } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import {
  checkUserPassword,
  createAccessToken,
  createRefreshTokenRecord,
} from "@/lib/server/auth";
import { setRefreshCookie } from "@/lib/server/cookies";

export async function POST(req: Request) {
  return handleApi(req, async () => {
    const body = await readJsonBody<{ userName?: string; password?: string }>(
      req,
    );

    if (!body?.userName || !body?.password) {
      throw apiError(400, "validation");
    }

    const user = await checkUserPassword(body.userName, body.password);
    const authUser = { id: user.id, userName: user.userName };

    const refreshToken = await createRefreshTokenRecord(req, authUser);

    const res = NextResponse.json({
      data: {
        userId: authUser.id,
        userName: authUser.userName,
        accessToken: createAccessToken(authUser),
      },
    });
    setRefreshCookie(res, refreshToken);
    return res;
  });
}
