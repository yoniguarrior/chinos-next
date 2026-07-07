import { NextResponse } from "next/server";
import { handleApi, readJsonBody } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import { doResetPassword } from "@/lib/server/auth";

export async function POST(req: Request) {
  return handleApi(req, async () => {
    const body = await readJsonBody<{ uuid?: string; password?: string }>(req);
    if (!body?.uuid || !body?.password) {
      throw apiError(400, "validation");
    }

    return NextResponse.json({
      data: await doResetPassword(req, body.uuid, body.password),
    });
  });
}
