"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { getRanking } from "@/lib/ranking";
import { RankingPeriod, RankingType } from "@/types/enums";
import type { IPeriodBlock, IRanking } from "@/types/ranking";
import { Loading } from "@/components/loading";
import { RankingTable } from "./ranking-table";

const emptyBlock = (): IPeriodBlock => ({
  points: [],
  games_won: [],
  games_lost: [],
});

const EMPTY_RANKING: IRanking = {
  global: emptyBlock(),
  month: emptyBlock(),
  week: emptyBlock(),
  day: emptyBlock(),
};

export function RankingContent() {
  const t = useTranslations();

  const [ranking, setRanking] = useState<IRanking>(EMPTY_RANKING);
  const [loaded, setLoaded] = useState(false);
  const startedRef = useRef(false);

  const periods = Object.values(RankingPeriod);
  const types = Object.values(RankingType);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void getRanking().then((data) => {
      if (data) setRanking({ ...EMPTY_RANKING, ...data });
      setLoaded(true);
    });
  }, []);

  return (
    <>
      {periods.map((period) => (
        <div key={period} className="group-ranking pt-2">
          <h4 className="ranking-group-title">{t(`ranking.${period}`)}</h4>

          {ranking[period].points.length > 0 ? (
            <div className="type-wrapper">
              <hr />
              {types.map((type) => (
                <div key={type} className="ranking-wrap">
                  <h5 className="list-title">{t(`ranking.${type}`)}</h5>
                  <div id={`ranking-${period}-${type}`} className="ranking-table">
                    {loaded ? (
                      <RankingTable
                        listType={type}
                        listData={ranking[period][type]}
                      />
                    ) : (
                      <Loading />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <p className="pl-8 font-bold">{t("ranking.no_data")}</p>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
