"use client";

import { useLocale, useTranslations } from "next-intl";
import type { IRankingItem } from "@/types/ranking";

interface LeaderboardProps {
  items: IRankingItem[];
  currentUserName?: string;
}

function avatarInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export function Leaderboard({ items, currentUserName }: LeaderboardProps) {
  const t = useTranslations();

  if (items.length === 0) {
    return (
      <div className="leaderboard-empty">{t("ranking.no_data")}</div>
    );
  }

  return (
    <div className="leaderboard-panel">
      {items.map((item, index) => {
        const isSelf =
          currentUserName !== undefined &&
          currentUserName !== "" &&
          item.userName === currentUserName;

        return (
          <div
            key={item.userName}
            className={`leaderboard-row${isSelf ? " leaderboard-row-self" : ""}`}
          >
            <div className="leaderboard-rank">{index + 1}</div>
            <div className="leaderboard-avatar" aria-hidden>
              {avatarInitial(item.userName)}
            </div>
            <div className="leaderboard-name">
              {isSelf ? t("ranking.you") : item.userName}
            </div>
            <div className="leaderboard-score">{item.score}</div>
          </div>
        );
      })}
    </div>
  );
}

interface RankingSummaryProps {
  position: number;
  totalUsers: number;
  winRatio: number;
}

export function RankingSummary({
  position,
  totalUsers,
  winRatio,
}: RankingSummaryProps) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <div className="ranking-summary-card">
      <div>
        <div className="ranking-summary-label">{t("ranking.your_position")}</div>
        <div className="ranking-summary-value ranking-summary-position">
          #{position} {t("ranking.of")} {totalUsers}
        </div>
      </div>
      <div className="text-right">
        <div className="ranking-summary-label">{t("ranking.win_ratio")}</div>
        <div className="ranking-summary-value ranking-summary-ratio">
          {winRatio.toLocaleString(locale, {
            style: "percent",
            maximumFractionDigits: 0,
          })}
        </div>
      </div>
    </div>
  );
}
