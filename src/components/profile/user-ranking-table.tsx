"use client";

import { useLocale, useTranslations } from "next-intl";
import { RankingType } from "@/types/enums";
import type { IUserPeriodBlock } from "@/types/ranking";

export function UserRankingTable({
  userRanking,
}: {
  userRanking?: IUserPeriodBlock;
}) {
  const t = useTranslations();
  const locale = useLocale();

  const types = Object.values(RankingType);

  if (!userRanking) {
    return (
      <div className="no-data">
        <h5>{t("ranking.no_data")}</h5>
      </div>
    );
  }

  return (
    <div className="list">
      <div className="list-header">
        <div className="list-row cols-1-2">
          <div className="list-cell first">{t("ranking.item")}</div>
          <div className="list-cell score">{t("ranking.value")}</div>
          <div className="list-cell rounds">{t("ranking.position")}</div>
        </div>
      </div>
      <div className="list-body">
        {types.map((type) => (
          <div key={type} className="list-row cols-1-2">
            <div className="list-cell first text-left">
              {t(`ranking.${type}_short`)}
            </div>
            <div className="list-cell score">
              {type === RankingType.Points
                ? userRanking[type].score
                : userRanking[type].score.toLocaleString(locale, {
                    style: "percent",
                    maximumFractionDigits: 1,
                  })}
            </div>
            <div className="list-cell rounds">
              {`${userRanking[type].position} ${t("ranking.of")} ${userRanking.totalUsers}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
