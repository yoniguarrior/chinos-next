"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { getRanking, getUserRanking } from "@/lib/ranking";
import { useAuthStore } from "@/stores/auth";
import { RankingPeriod } from "@/types/enums";
import type { IRanking, IURanking } from "@/types/ranking";
import { Loading } from "@/components/loading";
import { Leaderboard, RankingSummary } from "./leaderboard";

const DISPLAY_PERIODS = [
  RankingPeriod.Global,
  RankingPeriod.Month,
  RankingPeriod.Week,
] as const;

type DisplayPeriod = (typeof DISPLAY_PERIODS)[number];

const emptyBlock = () => ({
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
  const isLogged = useAuthStore((s) => s.user.userId !== "");
  const userName = useAuthStore((s) => s.user.userName);

  const [ranking, setRanking] = useState<IRanking>(EMPTY_RANKING);
  const [userRanking, setUserRanking] = useState<IURanking | undefined>();
  const [period, setPeriod] = useState<DisplayPeriod>(RankingPeriod.Global);
  const [loaded, setLoaded] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void getRanking().then((data) => {
      if (data) setRanking({ ...EMPTY_RANKING, ...data });
      setLoaded(true);
    });

    if (isLogged) {
      void getUserRanking().then(setUserRanking);
    }
  }, [isLogged]);

  const points = ranking[period].points;
  const userBlock = userRanking?.[period];

  return (
    <div className="ranking-page">
      <div className="period-pills">
        {DISPLAY_PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            className={`period-pill${period === p ? " period-pill-active" : ""}`}
            onClick={() => setPeriod(p)}
          >
            {t(`ranking.${p}`)}
          </button>
        ))}
      </div>

      {!loaded ? (
        <Loading />
      ) : (
        <>
          <Leaderboard
            items={points}
            currentUserName={isLogged ? userName : undefined}
          />
          {isLogged && userBlock && userBlock.totalUsers > 0 && (
            <RankingSummary
              position={userBlock.points.position}
              totalUsers={userBlock.totalUsers}
              winRatio={userBlock.games_won.score}
            />
          )}
        </>
      )}
    </div>
  );
}
