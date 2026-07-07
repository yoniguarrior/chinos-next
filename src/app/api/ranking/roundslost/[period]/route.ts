import { NextResponse } from "next/server";
import { handleApi } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import {
  getRankingByGamesLost,
  RANKING_PERIODS,
  type RankingPeriod,
} from "@/lib/server/ranking";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ period: string }> },
) {
  return handleApi(req, async () => {
    const { period } = await params;
    if (!RANKING_PERIODS.includes(period as RankingPeriod)) {
      throw apiError(400, "invalid_period");
    }
    return NextResponse.json({
      data: await getRankingByGamesLost(period as RankingPeriod),
    });
  });
}
