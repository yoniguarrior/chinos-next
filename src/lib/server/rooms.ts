import type { HydratedDocument } from "mongoose";
import { RoomModel, type Game, type Player, type Room } from "../../models/room";
import { UserModel } from "../../models/user";
import { apiError } from "./errors";
import { comparePassword } from "./crypto";
import { getRefreshCookie, getWsCookie } from "./cookies";
import { signWsToken, verifyRefreshToken, verifyWsToken } from "./jwt";
import { serverConfig } from "./config";

function createDefaultGame(): Game {
  return {
    players: [],
    playerStart: 0,
    playerInTurn: 0,
    status: "waitingStart",
    usersReconn: [],
    inGamePlayers: [],
    activePlayers: 0,
    gameInPause: false,
  };
}

/** Rooms saved without a game subdocument (legacy / incomplete create) break join. */
export function ensureRoomGame(room: HydratedDocument<Room>): void {
  if (!room.game?.status) {
    room.game = createDefaultGame();
    room.markModified("game");
  } else if (!room.game.players) {
    room.game.players = [];
    room.markModified("game");
  }
  if (!room.status) {
    room.status = "open";
  }
}

/* ------------------------------------------------------------------ *
 * Queries
 * ------------------------------------------------------------------ */

async function isRoomNameUnique(roomName: string): Promise<void> {
  const room = await RoomModel.findOne({ roomName }).setOptions({
    sanitizeFilter: true,
  });
  if (room) throw apiError(400, "unique_roomName");
}

export interface CreateRoomInput {
  roomName: string;
  roomType: Room["roomType"];
  owner?: string;
  password?: string;
  users?: string[];
}

export async function createRoom(input: CreateRoomInput) {
  await isRoomNameUnique(input.roomName);
  const room = new RoomModel({
    ...input,
    game: createDefaultGame(),
    users: input.users ?? [],
    messages: [],
    status: "open",
  });
  return room.save();
}

export function findAllRooms() {
  return RoomModel.find().select("-password -game.players.coins");
}

export function findPublicRooms() {
  return RoomModel.find({ roomType: "public" }).select(
    "roomName roomType status game.players game.status",
  );
}

export function findUserRooms(userName: string) {
  return RoomModel.find({ users: userName, roomType: "private" }).select(
    "roomName roomType owner users status game.players game.status",
  );
}

export function findUserActiveRoom(userName: string) {
  return RoomModel.find({ "game.players.name": userName }).select("-password");
}

export function findRoom(roomName: string) {
  return RoomModel.findOne({ roomName })
    .select("-password -game.players.coins")
    .setOptions({ sanitizeFilter: true });
}

export async function updateRoomByName(
  roomName: string,
  updateData: Partial<Room>,
): Promise<boolean> {
  const res = await RoomModel.updateOne(
    { roomName, roomType: "private" },
    updateData,
  );
  if (res.matchedCount === 0) throw apiError(404, "no_room_or_not_private");
  return res.modifiedCount === 1;
}

export async function deleteRoomByName(roomName: string): Promise<boolean> {
  const res = await RoomModel.deleteOne({ roomName }).setOptions({
    sanitizeFilter: true,
  });
  if (res.deletedCount === 0) throw apiError(404, "no_room");
  return res.acknowledged;
}

/* ------------------------------------------------------------------ *
 * Membership checks
 * ------------------------------------------------------------------ */

export async function checkRoomUser(
  roomName: string,
  playerName: string,
): Promise<boolean> {
  const room = await RoomModel.findOne({ roomName }).setOptions({
    sanitizeFilter: true,
  });
  return !!room && room.users.includes(playerName);
}

export async function checkRoomPassword(
  roomName: string,
  attemptPass: string,
): Promise<boolean> {
  const room = await RoomModel.findOne({ roomName }).setOptions({
    sanitizeFilter: true,
  });
  if (!room || !room.password) throw apiError(400, "auth_fail");
  if (!(await comparePassword(attemptPass, room.password))) {
    throw apiError(400, "auth_fail");
  }
  return true;
}

export async function checkRoomOwner(
  roomName: string,
  playerName: string,
): Promise<boolean> {
  const room = await RoomModel.findOne({ roomName }).setOptions({
    sanitizeFilter: true,
  });
  return !!room && room.owner === playerName;
}

export async function getUserFromRefreshJwt(
  token: string,
): Promise<string | null> {
  const payload = verifyRefreshToken(token);
  return payload?.userName ?? null;
}

/**
 * Returns true if a user is registered with `playerName`, unless the current
 * request belongs to that same logged-in user (refresh cookie).
 */
export async function checkPlayerNameAsUser(
  req: Request,
  playerName: string,
): Promise<boolean> {
  const found = await UserModel.find({ userName: playerName });

  const refresh = getRefreshCookie(req);
  if (refresh) {
    const userName = await getUserFromRefreshJwt(refresh);
    if (userName && userName === playerName) return false;
  }

  return found.length > 0;
}

export async function checkPlayerNameAsPlayer(
  roomName: string,
  playerName: string,
): Promise<boolean> {
  const found = await RoomModel.find({
    roomName,
    "game.players.name": playerName,
  });
  return found.length > 0;
}

export async function checkUniquePlayerName(
  req: Request,
  roomName: string,
  playerName: string,
): Promise<boolean> {
  const isLikeUser = await checkPlayerNameAsUser(req, playerName);
  if (isLikeUser) {
    const refresh = getRefreshCookie(req);
    if (refresh) {
      const userName = await getUserFromRefreshJwt(refresh);
      if (userName && userName === playerName) return true;
    }
    throw apiError(400, "existent_user_not_logged");
  }

  const isLikePlayer = await checkPlayerNameAsPlayer(roomName, playerName);
  if (isLikePlayer) throw apiError(400, "name_already_exists");

  return true;
}

/* ------------------------------------------------------------------ *
 * User management (owner / admin)
 * ------------------------------------------------------------------ */

export async function addUserToRoom(
  roomName: string,
  userName: string,
): Promise<boolean> {
  const res = await RoomModel.updateOne(
    { roomName },
    { $addToSet: { users: userName } },
  );
  if (res.matchedCount === 0) throw apiError(404, "non_existing_room");
  return res.modifiedCount === 1;
}

export async function removeUserFromRoom(
  roomName: string,
  userName: string,
): Promise<boolean> {
  const res = await RoomModel.updateOne(
    { roomName },
    { $pull: { users: userName } },
  );
  if (res.matchedCount === 0) throw apiError(404, "non_existing_player");
  return res.modifiedCount === 1;
}

/* ------------------------------------------------------------------ *
 * Join / leave (the route handler manages the ws_chgame cookie with the
 * returned wsToken / clearWsCookie flag)
 * ------------------------------------------------------------------ */

export interface JoinRoomResult {
  roomName: string;
  playerName: string;
  /** Token the route must set as the ws_chgame cookie. */
  wsToken: string;
}

export async function joinRoom(
  req: Request,
  roomName: string,
  playerName: string,
  publicRoom: boolean,
): Promise<JoinRoomResult> {
  if (!serverConfig.jwtWsSecret()) {
    throw apiError(503, "server_misconfig");
  }

  const room = await RoomModel.findOne({ roomName }).setOptions({
    sanitizeFilter: true,
  });

  if (!room) throw apiError(400, "non_existing_room");

  ensureRoomGame(room);

  if (publicRoom && room.roomType === "private") {
    throw apiError(403, "not_public_room");
  }

  if (room.game.status !== "waitingStart" || room.status !== "open") {
    throw apiError(403, "room_closed");
  }

  const wsCookie = getWsCookie(req);
  if (wsCookie) {
    const payload = verifyWsToken(wsCookie);
    if (payload) {
      const oldRoom = await RoomModel.findOne({ roomName: payload.sub });
      if (oldRoom) {
        if (oldRoom.roomName !== roomName) {
          throw apiError(403, "joined_in_other");
        }
        if (payload.userName !== playerName) {
          throw apiError(400, "different_playername");
        }
        if (room.game.players.find((p) => p.name === playerName)) {
          throw apiError(400, "already_joined");
        }
      }
    }
  }

  room.game.players.push({
    name: playerName,
    online: false,
    socketId: "",
    saved: false,
    coins: null,
    bet: null,
    lifted: true,
    playedRounds: 0,
    wonRounds: {
      first: 0,
      won5: 0,
      won4: 0,
      won3: 0,
      won2: 0,
    },
    lostRounds: 0,
    points: 0,
  } satisfies Player);

  if (room.game.players.length > 4) room.status = "closed";

  room.markModified("game");

  try {
    await room.save();
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "name" in err &&
      err.name === "ValidationError"
    ) {
      throw apiError(400, "validation");
    }
    throw err;
  }

  return { roomName, playerName, wsToken: signWsToken(playerName, roomName) };
}

export interface LeaveRoomResult {
  roomName: string;
  playerName: string;
}

export async function leaveRoom(req: Request): Promise<LeaveRoomResult> {
  const wsCookie = getWsCookie(req);
  if (!wsCookie) throw apiError(400, "no_joined_room");

  const payload = verifyWsToken(wsCookie);
  if (!payload) throw apiError(400, "no_joined_room");

  const room = await RoomModel.findOne({ roomName: payload.sub }).setOptions({
    sanitizeFilter: true,
  });

  if (room) {
    ensureRoomGame(room);

    if (room.game.status !== "waitingStart") {
      throw apiError(403, "game_in_play");
    }

    const ix = room.game.players.findIndex((p) => p.name === payload.userName);
    if (ix !== -1) room.game.players.splice(ix, 1);

    if (room.game.players.length === 0 && room.roomType === "public") {
      await RoomModel.deleteOne({ roomName: payload.sub }).setOptions({
        sanitizeFilter: true,
      });
    } else {
      await room.save();
    }
  }

  return { roomName: payload.sub, playerName: payload.userName };
}
