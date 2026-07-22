export enum GameStatus {
  WaitingStart = "waitingStart",
  TakingCoins = "takingCoins",
  Betting = "betting",
  Showing = "showing",
  FinishHand = "finishHand",
  FinishRound = "finishRound",
  WaitingNewRound = "waitingNewRound",
  SelectingNext = "selectingNext",
}

export enum MessageType {
  Info = "info",
  Warning = "warning",
  Alert = "alert",
  Success = "succes",
}

export enum RankingPeriod {
  Global = "global",
  Month = "month",
  Week = "week",
  Day = "day",
}

export enum RankingType {
  Points = "points",
  GamesWon = "games_won",
  GamesLost = "games_lost",
}

export enum RoomStatus {
  Closed = "closed",
  Open = "open",
  Playing = "playing",
  Full = "full",
}

export enum RoomType {
  Private = "private",
  Public = "public",
}

export enum Role {
  User = "user",
  Prime = "prime",
  Moderator = "moderator",
  Admin = "admin",
}
