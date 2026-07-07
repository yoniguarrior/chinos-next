import { NextResponse } from "next/server";
import { handleApi, readJsonBody } from "@/lib/server/handler";
import { checkPlayerNameAsPlayer } from "@/lib/server/rooms";

export async function POST(req: Request) {
  return handleApi(req, async () => {
    const body = await readJsonBody<{
      roomName?: string;
      playerName?: string;
    }>(req);
    return NextResponse.json(
      {
        data: await checkPlayerNameAsPlayer(
          String(body?.roomName ?? ""),
          String(body?.playerName ?? ""),
        ),
      },
      { status: 201 },
    );
  });
}
