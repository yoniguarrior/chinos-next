import { RankingModel } from "@/models/ranking";

export const RANKING_PERIODS = ["global", "month", "week", "day"] as const;
export type RankingPeriod = (typeof RANKING_PERIODS)[number];

export const RANKING_TYPES = ["points", "games_won", "games_lost"] as const;
export type RankingType = (typeof RANKING_TYPES)[number];

export interface RankingItem {
  userName: string;
  score: number;
  rounds: number;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 3600 * 1000);
}

function periodStart(period: RankingPeriod): Date {
  switch (period) {
    case "month":
      return daysAgo(30);
    case "week":
      return daysAgo(7);
    case "day":
      return daysAgo(1);
    case "global":
    default:
      return new Date(0);
  }
}

export function getRankingByPoints(
  period: RankingPeriod,
): Promise<RankingItem[]> {
  return RankingModel.aggregate([
    { $match: { scoreDate: { $gte: periodStart(period) } } },
    {
      $group: {
        _id: "$userName",
        score: { $sum: "$points" },
        rounds: { $sum: "$playedRounds" },
      },
    },
    { $set: { userName: "$_id" } },
    { $unset: ["_id"] },
    { $sort: { score: -1, rounds: 1 } },
    { $limit: 10 },
  ]);
}

export function getRankingByGamesWon(
  period: RankingPeriod,
): Promise<RankingItem[]> {
  return RankingModel.aggregate([
    { $match: { scoreDate: { $gte: periodStart(period) } } },
    {
      $group: {
        _id: "$userName",
        totalWon: { $sum: "$wonRounds.first" },
        rounds: { $sum: "$playedRounds" },
      },
    },
    { $set: { userName: "$_id", score: { $divide: ["$totalWon", "$rounds"] } } },
    { $unset: ["_id", "totalWon"] },
    { $sort: { score: -1, rounds: 1 } },
    { $limit: 10 },
  ]);
}

export function getRankingByGamesLost(
  period: RankingPeriod,
): Promise<RankingItem[]> {
  return RankingModel.aggregate([
    { $match: { scoreDate: { $gte: periodStart(period) } } },
    {
      $group: {
        _id: "$userName",
        totalLost: { $sum: "$lostRounds" },
        rounds: { $sum: "$playedRounds" },
      },
    },
    {
      $set: { userName: "$_id", score: { $divide: ["$totalLost", "$rounds"] } },
    },
    { $unset: ["_id", "totalLost"] },
    { $sort: { score: -1, rounds: 1 } },
    { $limit: 10 },
  ]);
}

export async function getRanking() {
  const result: Record<string, Record<string, RankingItem[]>> = {
    global: { points: [], games_won: [], games_lost: [] },
    month: { points: [], games_won: [], games_lost: [] },
    week: { points: [], games_won: [], games_lost: [] },
    day: { points: [], games_won: [], games_lost: [] },
  };

  await Promise.all(
    RANKING_PERIODS.map(async (period) => {
      const [points, gamesWon, gamesLost] = await Promise.all([
        getRankingByPoints(period),
        getRankingByGamesWon(period),
        getRankingByGamesLost(period),
      ]);
      result[period] = {
        points,
        games_won: gamesWon,
        games_lost: gamesLost,
      };
    }),
  );

  return result;
}

export async function getUserRanking(userName: string) {
  const result: Record<string, unknown> = {};

  for (const period of RANKING_PERIODS) {
    const res: Array<Record<string, number | string>> =
      await RankingModel.aggregate([
        { $match: { scoreDate: { $gte: periodStart(period) } } },
        {
          $group: {
            _id: "$userName",
            points: { $sum: "$points" },
            totalWon: { $sum: "$wonRounds.first" },
            totalLost: { $sum: "$lostRounds" },
            rounds: { $sum: "$playedRounds" },
          },
        },
        {
          $set: {
            userName: "$_id",
            games_won: { $divide: ["$totalWon", "$rounds"] },
            games_lost: { $divide: ["$totalLost", "$rounds"] },
          },
        },
        { $unset: ["_id", "totalWon", "totalLost"] },
      ]);

    if (res.length === 0) break;

    let periodData: Record<string, unknown> = { totalUsers: res.length };

    for (const type of RANKING_TYPES) {
      res.sort((a, b) => (b[type] as number) - (a[type] as number));
      const idx = res.findIndex((e) => e.userName === userName);
      if (idx === -1) break;
      periodData = {
        ...periodData,
        [type]: {
          type,
          score: res[idx]![type],
          position: idx + 1,
        },
      };
    }

    result[period] = periodData;
  }

  return result;
}
