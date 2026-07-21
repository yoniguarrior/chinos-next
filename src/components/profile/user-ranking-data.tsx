"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { RankingPeriod } from "@/types/enums";
import type { IURanking } from "@/types/ranking";

interface UserRankingDataProps {
  myRanking?: IURanking;
  onRefresh: () => void;
}

export function UserRankingData({ myRanking, onRefresh }: UserRankingDataProps) {
  const t = useTranslations();

  const periods: RankingPeriod[] = [
    RankingPeriod.Global,
    RankingPeriod.Month,
    RankingPeriod.Week,
  ];
  const [activePeriod, setActivePeriod] = useState<RankingPeriod>(RankingPeriod.Global);
  const block = myRanking?.[activePeriod];

  return (
    <>
      <div className="profile-ranking-refresh">
        <button type="button" className="profile-ranking-refresh-btn" onClick={onRefresh}>
          <RefreshCw className="h-4.75 w-4.75" />
        </button>
      </div>

      {myRanking ? (
        <div className="profile-ranking-body">
          <div className="period-pills">
            {periods.map((period) => (
              <button
                key={period}
                type="button"
                className={`period-pill${activePeriod === period ? " period-pill-active" : ""}`}
                onClick={() => setActivePeriod(period)}
              >
                {t(`ranking.${period}`)}
              </button>
            ))}
          </div>

          {block && block.totalUsers > 0 ? (
            <div className="profile-ranking-kv">
              <div className="profile-ranking-kv-row">
                <span>{t("ranking.position")}</span>
                <strong>
                  #{block.points.position} {t("ranking.of")} {block.totalUsers}
                </strong>
              </div>
              <div className="profile-ranking-kv-row">
                <span>{t("ranking.points_short")}</span>
                <strong>{block.points.score}</strong>
              </div>
              <div className="profile-ranking-kv-row">
                <span>{t("ranking.win_ratio")}</span>
                <strong className="text-ch-win">
                  {Math.round(block.games_won.score * 100)}%
                </strong>
              </div>
            </div>
          ) : (
            <p className="no-data pl-2 font-bold">{t("ranking.no_data")}</p>
          )}
        </div>
      ) : (
        <div className="no-data">
          <h5>{t("ranking.no_data")}</h5>
        </div>
      )}
    </>
  );
}
