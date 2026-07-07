import mongoose, { Schema, type Model } from "mongoose";
import bcrypt from "bcryptjs";
import { wonDataSchema, type WonData } from "./ranking";

export const ROOM_TYPES = ["private", "public"] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const ROOM_STATUS = ["closed", "open", "playing"] as const;
export type RoomStatus = (typeof ROOM_STATUS)[number];

export const GAME_STATUS = [
  "waitingStart",
  "takingCoins",
  "betting",
  "showing",
  "finishHand",
  "finishRound",
  "waitingNewRound",
  "selectingNext",
] as const;
export type GameStatus = (typeof GAME_STATUS)[number];

export interface Player {
  name: string;
  online: boolean;
  socketId: string;
  saved: boolean;
  coins: number | null;
  bet: number | null;
  lifted: boolean;
  playedRounds: number;
  wonRounds: WonData;
  lostRounds: number;
  points: number;
}

export interface Game {
  players: Player[];
  playerStart: number;
  playerInTurn: number;
  status: GameStatus;
  winner?: number | null;
  looser?: number | null;
  totalCoins?: number | null;
  usersReconn: string[];
  inGamePlayers: string[];
  activePlayers: number;
  gameInPause: boolean;
}

export interface Message {
  fromUser: string;
  text: string;
  timeSent: Date;
}

export interface Room {
  roomName: string;
  roomType: RoomType;
  owner?: string;
  password?: string;
  game: Game;
  users: string[];
  messages: Message[];
  status: RoomStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

const playerSchema = new Schema<Player>({
  name: { type: String, required: true, minlength: 3, maxlength: 10, trim: true },
  online: { type: Boolean, default: false },
  socketId: { type: String, default: "" },
  saved: { type: Boolean, default: false },
  coins: { type: Number, min: 0, max: 3, default: null },
  bet: { type: Number, default: null },
  lifted: { type: Boolean, default: true },
  playedRounds: { type: Number, default: 0 },
  wonRounds: wonDataSchema,
  lostRounds: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
});

const gameSchema = new Schema<Game>({
  players: [playerSchema],
  playerStart: { type: Number, default: 0 },
  playerInTurn: { type: Number, default: 0 },
  status: { type: String, enum: GAME_STATUS, default: "waitingStart" },
  winner: { type: Number, default: undefined },
  looser: { type: Number, default: undefined },
  totalCoins: { type: Number, default: undefined },
  usersReconn: [String],
  inGamePlayers: [String],
  activePlayers: { type: Number, default: 0 },
  gameInPause: { type: Boolean, default: false },
});

const messageSchema = new Schema<Message>({
  fromUser: { type: String },
  text: { type: String },
  timeSent: { type: Date },
});

const roomSchema = new Schema<Room>(
  {
    roomName: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 20,
      trim: true,
      unique: true,
    },
    roomType: { type: String, enum: ROOM_TYPES, default: "public" },
    owner: { type: String },
    password: { type: String, minlength: 8, maxlength: 1024 },
    game: { type: gameSchema, default: () => ({}) },
    users: { type: [String], default: [] },
    messages: { type: [messageSchema], default: [] },
    status: { type: String, enum: ROOM_STATUS, default: "open" },
  },
  { timestamps: { createdAt: "createdAt" } },
);

roomSchema.pre("save", async function () {
  if (!this.password || !this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

roomSchema.pre(
  "updateOne",
  { document: false, query: true },
  async function () {
    const update = this.getUpdate() as { password?: string } | null;
    if (!update?.password) return;
    update.password = await bcrypt.hash(update.password, 10);
    this.setUpdate(update);
  },
);

export const RoomModel: Model<Room> =
  (mongoose.models.Room as Model<Room>) ??
  mongoose.model<Room>("Room", roomSchema);
