import { NextResponse } from "next/server";
import { handleApi } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import { doForgotPasswordVerify } from "@/lib/server/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  return handleApi(req, async () => {
    const { uuid } = await params;
    if (!uuid) throw apiError(400, "not_valid");

    return NextResponse.json({ data: await doForgotPasswordVerify(req, uuid) });
  });
}
