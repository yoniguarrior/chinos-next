import { NextResponse } from "next/server";
import { handleApi, readJsonBody } from "@/lib/server/handler";
import { checkPlayerNameAsUser } from "@/lib/server/rooms";

export async function POST(req: Request) {
  return handleApi(req, async () => {
    const body = await readJsonBody<{ playerName?: string }>(req);
    return NextResponse.json(
      {
        data: await checkPlayerNameAsUser(req, String(body?.playerName ?? "")),
      },
      { status: 201 },
    );
  });
}
