import { NextResponse } from "next/server";
import { handleApi, readJsonBody } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import { requireUser, checkUserPassword } from "@/lib/server/auth";
import { changeUserPassword } from "@/lib/server/users";

export async function PATCH(req: Request) {
  return handleApi(req, async () => {
    const authUser = requireUser(req);
    const body = await readJsonBody<{
      oldPassword?: string;
      newPassword?: string;
    }>(req);

    if (!body?.oldPassword || !body?.newPassword) {
      throw apiError(400, "validation");
    }

    await checkUserPassword(authUser.userName, body.oldPassword);
    const changed = await changeUserPassword(
      authUser.userName,
      body.newPassword,
    );

    return NextResponse.json({
      data: changed ? "Password changed" : "Operation failed",
    });
  });
}
