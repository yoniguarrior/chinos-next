import { NextResponse } from "next/server";
import { handleApi, readJsonBody } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import { requireAdmin } from "@/lib/server/auth";
import {
  deleteUserById,
  getUserById,
  updateUserById,
} from "@/lib/server/users";
import type { Role } from "@/models/user";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  return handleApi(req, async () => {
    await requireAdmin(req);

    const { id } = await params;
    if (!id) throw apiError(400, "validation");

    const found = await getUserById(id);
    if (!found) throw apiError(404, "no_user");

    const obj = found.toObject() as unknown as Record<string, unknown>;
    delete obj.password;

    return NextResponse.json({ data: obj });
  });
}

export async function PATCH(req: Request, { params }: Params) {
  return handleApi(req, async () => {
    await requireAdmin(req);

    const { id } = await params;
    if (!id) throw apiError(400, "validation");

    const body = await readJsonBody<{ email?: string; roles?: Role[] }>(req);
    const updated = await updateUserById(id, {
      email: body?.email,
      roles: body?.roles,
    });

    return NextResponse.json({
      data: updated ? "User updated" : "Operation failed",
    });
  });
}

export async function DELETE(req: Request, { params }: Params) {
  return handleApi(req, async () => {
    await requireAdmin(req);

    const { id } = await params;
    if (!id) throw apiError(400, "validation");

    const deleted = await deleteUserById(id);
    return NextResponse.json({
      data: deleted ? "User deleted" : "Operation failed",
    });
  });
}
