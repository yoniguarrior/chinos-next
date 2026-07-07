import { NextResponse } from "next/server";
import { handleApi, readJsonBody } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import { createUserAccount } from "@/lib/server/users";

export async function POST(req: Request) {
  return handleApi(req, async () => {
    const body = await readJsonBody<{
      userName?: string;
      email?: string;
      password?: string;
    }>(req);

    if (!body?.userName || !body?.password) {
      throw apiError(400, "validation");
    }

    const data = await createUserAccount({
      userName: body.userName,
      email: body.email,
      password: body.password,
    });

    return NextResponse.json({ data }, { status: 201 });
  });
}
