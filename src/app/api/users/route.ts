import { NextResponse } from "next/server";
import { handleApi, readJsonBody } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import { requireAdmin } from "@/lib/server/auth";
import { createUserAccount, getAllUsers } from "@/lib/server/users";
import type { Role } from "@/models/user";

export async function GET(req: Request) {
  return handleApi(req, async () => {
    await requireAdmin(req);
    return NextResponse.json({ data: await getAllUsers() });
  });
}

export async function POST(req: Request) {
  return handleApi(req, async () => {
    await requireAdmin(req);

    const body = await readJsonBody<{
      userName?: string;
      email?: string;
      password?: string;
      roles?: Role[];
    }>(req);

    if (!body?.userName || !body?.password) {
      throw apiError(400, "validation");
    }

    const data = await createUserAccount({
      userName: body.userName,
      email: body.email,
      password: body.password,
      roles: body.roles,
    });

    return NextResponse.json({ data }, { status: 201 });
  });
}
