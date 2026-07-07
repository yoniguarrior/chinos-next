"use client";

import { useLocale, useTranslations } from "next-intl";
import { RankingType } from "@/types/enums";
import type { IRankingItem } from "@/types/ranking";

interface RankingTableProps {
  listType: RankingType;
  listData: IRankingItem[];
}

export function RankingTable({ listType, listData }: RankingTableProps) {
  const t = useTranslations();
  const locale = useLocale();

  const scoreLabel =
    listType === RankingType.Points ? "ranking.t_points" : "ranking.ratio";

  if (listData.length === 0) {
    return (
      <div className="no-data">
        <p className="pl-8 font-bold">{t("ranking.no_data")}</p>
      </div>
    );
  }

  return (
    <div className="list">
      <div className="list-header">
        <div className="list-row cols-3">
          <div className="list-cell first">{t("ranking.user_name")}</div>
          <div className="list-cell score">{t(scoreLabel)}</div>
          <div className="list-cell rounds">{t("ranking.rounds")}</div>
        </div>
      </div>
      <div className="list-body">
        {listData.map((item) => (
          <div key={item.userName} className="list-row cols-3">
            <div className="list-cell first">{item.userName}</div>
            <div className="list-cell score">
              {listType === RankingType.Points
                ? item.score
                : item.score.toLocaleString(locale, {
                    style: "percent",
                    maximumFractionDigits: 1,
                  })}
            </div>
            <div className="list-cell rounds">{item.rounds}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
