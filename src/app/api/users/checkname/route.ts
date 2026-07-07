import { NextResponse } from "next/server";
import { handleApi } from "@/lib/server/handler";
import { requireUser } from "@/lib/server/auth";
import { checkUserNameExists } from "@/lib/server/users";

export async function GET(req: Request) {
  return handleApi(req, async () => {
    requireUser(req);
    const userName = new URL(req.url).searchParams.get("userName");
    return NextResponse.json({
      data: await checkUserNameExists(String(userName ?? "")),
    });
  });
}
