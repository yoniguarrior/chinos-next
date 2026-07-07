import { NextResponse } from "next/server";
import { handleApi } from "@/lib/server/handler";
import { getRanking } from "@/lib/server/ranking";

export async function GET(req: Request) {
  return handleApi(req, async () => {
    return NextResponse.json({ data: await getRanking() });
  });
}
