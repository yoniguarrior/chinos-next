import type { RankingType } from "./enums";

export interface IRankingItem {
  userName: string;
  score: number;
  rounds: number;
}

export interface IPeriodBlock {
  points: IRankingItem[];
  games_won: IRankingItem[];
  games_lost: IRankingItem[];
}

export interface IRanking {
  global: IPeriodBlock;
  month: IPeriodBlock;
  week: IPeriodBlock;
  day: IPeriodBlock;
}

export interface IURankingItem {
  type: RankingType;
  score: number;
  position: number;
}

export interface IUserPeriodBlock {
  totalUsers: number;
  points: IURankingItem;
  games_won: IURankingItem;
  games_lost: IURankingItem;
}

export interface IURanking {
  global?: IUserPeriodBlock;
  month?: IUserPeriodBlock;
  week?: IUserPeriodBlock;
  day?: IUserPeriodBlock;
}
