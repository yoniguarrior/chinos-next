import { NextResponse } from "next/server";
import { handleApi, readJsonBody } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import { doForgotPassword } from "@/lib/server/auth";

export async function POST(req: Request) {
  return handleApi(req, async () => {
    const body = await readJsonBody<{ email?: string }>(req);
    if (!body?.email) throw apiError(400, "validation");

    return NextResponse.json({ data: await doForgotPassword(req, body.email) });
  });
}
