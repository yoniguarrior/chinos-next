import type { GameStatus, RoomStatus, RoomType } from "./enums";

export interface Player {
  name: string;
  online: boolean;
  socketId?: string;
  saved: boolean;
  coins?: number | null;
  bet?: number | null;
  lifted: boolean;
  playedRounds?: number;
  wonRounds?: unknown;
  lostRounds?: number;
  points?: number;
}

export interface Game {
  players: Player[];
  playerStart: number;
  playerInTurn: number;
  status: GameStatus;
  winner: number | null;
  looser: number | null;
  totalCoins: number;
  usersReconn: string[];
  inGamePlayers: string[];
  activePlayers: number;
  gameInPause: boolean;
  reconnFailed: boolean;
  reconnAttempt: number;
}

export interface Message {
  fromUser: string;
  text: string;
  timeSent: Date | string;
}

interface Gmr {
  players: Player[];
  status: GameStatus;
}

export interface IRoom {
  roomName: string;
  roomType?: RoomType;
  owner?: string;
  password?: string;
  users?: string[];
  status?: RoomStatus;
  game?: Gmr;
}

export interface IXRoom {
  roomName: string;
  roomType?: RoomType;
  owner?: string;
  password?: string;
  game: Game;
  users?: string[];
  messages?: Message[];
  status?: RoomStatus;
}
