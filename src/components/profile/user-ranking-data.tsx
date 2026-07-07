"use client";

import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { RankingPeriod } from "@/types/enums";
import type { IURanking } from "@/types/ranking";
import { UserRankingTable } from "./user-ranking-table";

interface UserRankingDataProps {
  myRanking?: IURanking;
  onRefresh: () => void;
}

export function UserRankingData({ myRanking, onRefresh }: UserRankingDataProps) {
  const t = useTranslations();

  const periods = Object.values(RankingPeriod);

  return (
    <>
      <div className="refresh w-full text-right">
        <button type="button" className="btn btn-square" onClick={onRefresh}>
          <RefreshCw className="inline h-5 w-5" />
        </button>
      </div>

      {myRanking ? (
        <div className="user-ranking">
          {periods.map((period) => {
            const block = myRanking[period];
            return (
              <div key={period} className="group-ranking pt-2">
                <h4 className="ranking-group-title">{t(`ranking.${period}`)}</h4>
                <hr />
                {block && block.totalUsers > 0 ? (
                  <UserRankingTable userRanking={block} />
                ) : (
                  <p className="no-data pl-8 font-bold">{t("ranking.no_data")}</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-data">
          <h5>{t("ranking.no_data")}</h5>
        </div>
      )}
    </>
  );
}
