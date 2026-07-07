import { NextResponse } from "next/server";
import { handleApi, readJsonBody } from "@/lib/server/handler";
import { requireUser } from "@/lib/server/auth";
import { updateUserById } from "@/lib/server/users";

export async function PATCH(req: Request) {
  return handleApi(req, async () => {
    const authUser = requireUser(req);
    const body = await readJsonBody<{ email?: string }>(req);

    const updated = await updateUserById(
      authUser.id,
      { email: body?.email },
      true,
    );

    return NextResponse.json({
      data: updated ? "User updated" : "Operation failed",
    });
  });
}
