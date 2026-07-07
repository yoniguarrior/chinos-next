import { NextResponse } from "next/server";
import { handleApi } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import { requireUser } from "@/lib/server/auth";
import { updateVerifyKey } from "@/lib/server/users";
import { sendEmailVerify } from "@/lib/server/mailer";

export async function GET(req: Request) {
  return handleApi(req, async () => {
    const authUser = requireUser(req);

    const myUser = await updateVerifyKey(authUser.id);
    if (!myUser.email) throw apiError(404, "no_email");

    const res = await sendEmailVerify(
      myUser.userName,
      myUser.email,
      myUser.emailVerifyKey,
    );

    return NextResponse.json({ data: res });
  });
}
