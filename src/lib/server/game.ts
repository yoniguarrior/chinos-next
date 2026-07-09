import jwt from "jsonwebtoken";
import type { HydratedDocument } from "mongoose";
import { RoomModel, type Player, type Room } from "../../models/room";
import { UserModel } from "../../models/user";
import { RankingModel } from "../../models/ranking";
import { serverConfig } from "./config";
import { ensureRoomGame } from "./rooms";

export interface IWsData {
  playerName: string;
  roomName: string;
}

export interface WsResult {
  event: string;
  data: unknown;
}

type RoomDoc = HydratedDocument<Room>;

/** Plain room payload for WebSocket / client (Mongoose docs do not always JSON-serialize cleanly). */
export function roomToClientPayload(room: RoomDoc) {
  const plain = room.toObject({ virtuals: false }) as Room;
  return {
    roomName: plain.roomName,
    roomType: plain.roomType,
    owner: plain.owner,
    game: plain.game,
    users: plain.users ?? [],
    messages: plain.messages ?? [],
    status: plain.status,
  };
}

/**
 * A WebSocket-level error. Thrown by the game logic and translated by the
 * WS server into an `{ event: "error", data: { error } }` envelope sent to the
 * offending peer only.
 */
export class WsError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = "WsError";
  }
}

/**
 * Per-room lock. Serializes the critical sections that read-modify-write a
 * room document (sync/disconnect). Works within a single Node instance (same
 * guarantee the original NestJS/Nuxt versions had).
 *
 * Lives on globalThis so the Next.js Route Handlers bundle and the WebSocket
 * server bundle (server.js) share the same lock.
 */
const globalWithLocks = globalThis as typeof globalThis & {
  __roomLocked?: string[];
};
const roomLocked: string[] = (globalWithLocks.__roomLocked ??= []);

function lockRoom(roomName: string): void {
  roomLocked.push(roomName);
}

function unlockRoom(roomName: string): void {
  const ix = roomLocked.findIndex((el) => el === roomName);
  if (ix !== -1) roomLocked.splice(ix, 1);
}

function waitTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

function isSet(value: number | null | undefined): value is number {
  return value !== null && value !== undefined;
}

export function nextPlayer(turn: number, players: Player[]): number {
  let ix = (turn + 1) % players.length;
  while (players[ix]!.saved) ix = (ix + 1) % players.length;
  return ix;
}

/* ------------------------------------------------------------------ *
 * sync
 * ------------------------------------------------------------------ */

export async function getSyncData(
  data: IWsData,
  socketId: string,
): Promise<WsResult> {
  for (;;) {
    if (roomLocked.includes(data.roomName)) {
      await waitTick();
      continue;
    }

    lockRoom(data.roomName);

    let roomData: RoomDoc | null;
    try {
      roomData = await RoomModel.findOne({ roomName: data.roomName }).setOptions(
        { sanitizeFilter: true },
      );

      if (!roomData) throw new WsError("non_existing_room");

      ensureRoomGame(roomData);

      const gameData = roomData.game;
      const playerIx = gameData.players.findIndex(
        (p) => p.name === data.playerName,
      );

      if (playerIx !== -1) {
        gameData.players[playerIx]!.online = true;
        gameData.players[playerIx]!.socketId = socketId;
        if (gameData.gameInPause) {
          gameData.usersReconn = [];
          gameData.players.forEach((p) => {
            if (!p.online) gameData.usersReconn.push(p.name);
          });
          if (gameData.usersReconn.length === 0) gameData.gameInPause = false;
        }
      } else if (gameData.status !== "waitingStart") {
        throw new WsError("game_in_play");
      } else {
        gameData.players.push({
          name: data.playerName,
          online: true,
          socketId,
        } as Player);
      }

      roomData.game = gameData;
      roomData.markModified("game");
      await roomData.save();
    } finally {
      unlockRoom(data.roomName);
    }

    const ownCoins =
      roomData.game.players.find((p) => p.socketId === socketId)?.coins ?? null;

    if (
      roomData.game.status === "betting" ||
      roomData.game.status === "takingCoins"
    ) {
      roomData.game.players.forEach((p) => (p.coins = null));
    }

    return {
      event: "syncRes",
      data: {
        roomData: roomToClientPayload(roomData),
        playerName: data.playerName,
        ownCoins,
      },
    };
  }
}

/* ------------------------------------------------------------------ *
 * gameStart
 * ------------------------------------------------------------------ */

export async function processStart(data: IWsData): Promise<WsResult> {
  const roomData = await RoomModel.findOne({
    roomName: data.roomName,
  }).setOptions({ sanitizeFilter: true });

  if (!roomData) throw new WsError("non_existing_room");

  roomData.status = "closed";
  const gameData = roomData.game;

  const connected = gameData.players.filter((p) => p.online === true);

  if (connected.length <= 1) throw new WsError("minimum_2_players");

  const nums: number[] = [];
  connected.forEach((_p, ix) => nums.push(ix));
  const order: number[] = [];
  let n = 0;
  while (nums.length > 1) {
    const i = Math.floor(Math.random() * nums.length);
    order[n] = nums[i]!;
    nums.splice(i, 1);
    n++;
  }
  order[n] = nums[0]!;

  gameData.players = [];
  order.forEach((p) => {
    gameData.players.push({
      name: connected[p]!.name,
      online: connected[p]!.online,
      socketId: connected[p]!.socketId,
      saved: false,
      coins: null,
      bet: null,
      lifted: true,
      playedRounds: 0,
      wonRounds: { first: 0, won5: 0, won4: 0, won3: 0, won2: 0 },
      lostRounds: 0,
      points: 0,
    } as Player);
  });

  gameData.playerStart = 0;
  gameData.playerInTurn = 0;
  gameData.status = "takingCoins";
  gameData.winner = null;
  gameData.looser = null;
  gameData.usersReconn = [];
  gameData.inGamePlayers = [];
  gameData.players
    .filter((p) => !p.saved)
    .forEach((player) => gameData.inGamePlayers.push(player.name));
  gameData.activePlayers = gameData.inGamePlayers.length;
  gameData.gameInPause = false;

  roomData.game = gameData;
  roomData.markModified("game");
  await roomData.save();

  return { event: "startRes", data: roomData };
}

/* ------------------------------------------------------------------ *
 * coinsTaken
 * ------------------------------------------------------------------ */

export async function annotateCoins(
  coins: number,
  data: IWsData,
): Promise<WsResult> {
  const roomData = await RoomModel.findOne({ roomName: data.roomName });
  if (!roomData) throw new WsError("non_existing_room");

  const gameData = roomData.game;
  const ix = gameData.players.findIndex((p) => p.name === data.playerName);
  if (ix === -1) throw new WsError("player_not_in_game");

  gameData.players[ix]!.coins = coins;
  gameData.players[ix]!.lifted = false;

  if (gameData.players.every((p) => !p.lifted || p.saved)) {
    gameData.status = "betting";
    gameData.playerInTurn = gameData.playerStart;
  }

  roomData.game = gameData;
  roomData.markModified("game");
  await roomData.save();

  roomData.game.players.forEach((p) => (p.coins = null));

  return { event: "gameUpdate", data: roomData };
}

/* ------------------------------------------------------------------ *
 * betSetted
 * ------------------------------------------------------------------ */

export async function annotateBet(
  bet: number,
  data: IWsData,
): Promise<WsResult> {
  const roomData = await RoomModel.findOne({ roomName: data.roomName });
  if (!roomData) throw new WsError("non_existing_room");

  const gameData = roomData.game;
  const ix = gameData.players.findIndex((p) => p.name === data.playerName);
  if (ix === -1) throw new WsError("player_not_in_game");

  if (!gameData.players.find((p) => p.bet === bet)) {
    gameData.players[ix]!.bet = bet;
  } else {
    throw new WsError("not_unique_bet");
  }

  gameData.playerInTurn = nextPlayer(gameData.playerInTurn, gameData.players);

  if (gameData.playerInTurn === gameData.playerStart) {
    gameData.status = "showing";
  }

  roomData.game = gameData;
  roomData.markModified("game");
  await roomData.save();

  if (roomData.game.status !== "showing") {
    roomData.game.players.forEach((p) => (p.coins = null));
  }

  return { event: "gameUpdate", data: roomData };
}

/* ------------------------------------------------------------------ *
 * showCoins
 * ------------------------------------------------------------------ */

export async function showCoins(data: IWsData): Promise<WsResult> {
  const roomData = await RoomModel.findOne({ roomName: data.roomName });
  if (!roomData) throw new WsError("non_existing_room");

  const gameData = roomData.game;
  const ix = gameData.players.findIndex((p) => p.name === data.playerName);
  if (ix !== -1 && !gameData.players[ix]!.saved) {
    gameData.players[ix]!.lifted = true;
  } else {
    throw new WsError("player_not_in_game");
  }

  gameData.playerInTurn = nextPlayer(gameData.playerInTurn, gameData.players);

  if (gameData.playerInTurn === gameData.playerStart) {
    let totalCoins = 0;
    gameData.players.forEach((p) => {
      if (!p.saved) totalCoins += p.coins ?? 0;
    });
    gameData.totalCoins = totalCoins;
    gameData.winner = gameData.players.findIndex((p) => p.bet === totalCoins);

    if (gameData.winner !== -1) {
      gameData.playerInTurn = gameData.winner;
    } else {
      gameData.winner = null;
    }

    gameData.status = "finishHand";
  }

  roomData.game = gameData;
  roomData.markModified("game");
  await roomData.save();

  return { event: "gameUpdate", data: roomData };
}

/* ------------------------------------------------------------------ *
 * closeHand
 * ------------------------------------------------------------------ */

export async function closeHand(data: IWsData): Promise<WsResult> {
  const roomData = await RoomModel.findOne({ roomName: data.roomName });
  if (!roomData) throw new WsError("non_existing_room");

  const gameData = roomData.game;

  const firstHand = gameData.activePlayers === gameData.players.length;

  if (isSet(gameData.winner)) {
    gameData.players[gameData.winner]!.saved = true;

    gameData.inGamePlayers = [];
    gameData.players
      .filter((p) => !p.saved)
      .forEach((player) => gameData.inGamePlayers.push(player.name));
    gameData.activePlayers = gameData.inGamePlayers.length;
  }

  if (gameData.activePlayers > 1) {
    gameData.status = "takingCoins";
    gameData.playerStart = nextPlayer(gameData.playerStart, gameData.players);
    gameData.playerInTurn = gameData.playerStart;
    gameData.players.forEach((player) => {
      player.bet = null;
      player.coins = player.saved ? 0 : null;
    });
  } else {
    gameData.looser = gameData.players.findIndex((p) => !p.saved);
    gameData.playerInTurn = gameData.looser;
    gameData.status = "finishRound";
  }

  if (isSet(gameData.winner)) {
    const winner = gameData.players[gameData.winner]!;
    if (firstHand) {
      winner.wonRounds.first += 1;
      winner.points += 1;
    }

    switch (gameData.activePlayers) {
      case 5:
        winner.wonRounds.won5 += 1;
        break;
      case 4:
        winner.wonRounds.won4 += 1;
        break;
      case 3:
        winner.wonRounds.won3 += 1;
        break;
      case 2:
        winner.wonRounds.won2 += 1;
        break;
    }

    winner.points += gameData.activePlayers;
    gameData.winner = null;
  }

  roomData.game = gameData;
  roomData.markModified("game");
  await roomData.save();

  return { event: "gameUpdate", data: roomData };
}

/* ------------------------------------------------------------------ *
 * closeRound
 * ------------------------------------------------------------------ */

export async function closeRound(data: IWsData): Promise<WsResult> {
  const roomData = await RoomModel.findOne({ roomName: data.roomName });
  if (!roomData) throw new WsError("non_existing_room");

  const gameData = roomData.game;

  gameData.players[gameData.looser!]!.lostRounds += 1;
  gameData.playerInTurn = gameData.looser!;
  gameData.players.forEach((p) => (p.playedRounds += 1));
  gameData.status = "waitingNewRound";

  roomData.game = gameData;
  roomData.markModified("game");
  await roomData.save();

  return { event: "gameUpdate", data: roomData };
}

/* ------------------------------------------------------------------ *
 * selectNext
 * ------------------------------------------------------------------ */

export async function selectNext(data: IWsData): Promise<WsResult> {
  const roomData = await RoomModel.findOne({ roomName: data.roomName });
  if (!roomData) throw new WsError("non_existing_room");

  roomData.game.status = "selectingNext";
  roomData.markModified("game");
  await roomData.save();

  return { event: "gameUpdate", data: roomData };
}

/* ------------------------------------------------------------------ *
 * newRound
 * ------------------------------------------------------------------ */

export async function newRound(
  playerStart: string,
  data: IWsData,
): Promise<WsResult> {
  const roomData = await RoomModel.findOne({ roomName: data.roomName });
  if (!roomData) throw new WsError("non_existing_room");

  const gameData = roomData.game;
  const startIx = gameData.players.findIndex((p) => p.name === playerStart);

  gameData.status = "takingCoins";
  gameData.playerStart = startIx;
  gameData.playerInTurn = startIx;
  gameData.inGamePlayers = [];
  gameData.players.forEach((p) => {
    p.bet = null;
    p.coins = null;
    p.lifted = true;
    p.saved = false;
    gameData.inGamePlayers.push(p.name);
  });
  gameData.activePlayers = gameData.inGamePlayers.length;
  gameData.winner = null;
  gameData.looser = null;
  gameData.totalCoins = null;

  roomData.game = gameData;
  roomData.markModified("game");
  await roomData.save();

  return { event: "gameUpdate", data: roomData };
}

/* ------------------------------------------------------------------ *
 * gameStop
 * ------------------------------------------------------------------ */

export async function gameStop(data: IWsData): Promise<WsResult> {
  const roomData = await RoomModel.findOne({ roomName: data.roomName });
  if (!roomData) throw new WsError("non_existing_room");

  const gameData = roomData.game;

  // Persist per-player stats to User + Ranking (awaited so scores are stored
  // before responding).
  for (const p of gameData.players) {
    const user = await UserModel.findOne({ userName: p.name }).setOptions({
      sanitizeFilter: true,
    });
    if (!user) continue;

    user.playedGames += p.playedRounds;
    user.wonGames.first += p.wonRounds.first;
    user.wonGames.won5 += p.wonRounds.won5;
    user.wonGames.won4 += p.wonRounds.won4;
    user.wonGames.won3 += p.wonRounds.won3;
    user.wonGames.won2 += p.wonRounds.won2;
    user.lostGames += p.lostRounds;
    user.points += p.points;
    await user.save();

    await RankingModel.create({
      userName: user.userName,
      wonRounds: p.wonRounds,
      lostRounds: p.lostRounds,
      points: p.points,
      playedRounds: p.playedRounds,
    });
  }

  gameData.status = "waitingStart";
  gameData.playerStart = 0;
  gameData.playerInTurn = 0;
  gameData.players.forEach((p) => {
    p.bet = null;
    p.coins = null;
    p.lifted = true;
    p.saved = false;
  });
  gameData.inGamePlayers = [];
  gameData.activePlayers = 0;
  gameData.winner = null;
  gameData.looser = null;

  if (roomData.game.players.length < 5) roomData.status = "open";

  roomData.game = gameData;
  roomData.markModified("game");
  await roomData.save();

  return { event: "stopRes", data: roomData };
}

/* ------------------------------------------------------------------ *
 * gameAbandon — end the current game without persisting stats/ranking.
 * Previously completed games (already saved via gameStop) are untouched.
 * ------------------------------------------------------------------ */

export async function gameAbandon(data: IWsData): Promise<WsResult> {
  const roomData = await RoomModel.findOne({ roomName: data.roomName });
  if (!roomData) throw new WsError("non_existing_room");

  const gameData = roomData.game;

  if (gameData.status === "waitingStart") {
    return { event: "stopRes", data: roomData };
  }

  gameData.status = "waitingStart";
  gameData.playerStart = 0;
  gameData.playerInTurn = 0;
  gameData.gameInPause = false;
  gameData.usersReconn = [];
  gameData.players.forEach((p) => {
    p.bet = null;
    p.coins = null;
    p.lifted = true;
    p.saved = false;
    p.playedRounds = 0;
    p.wonRounds = { first: 0, won5: 0, won4: 0, won3: 0, won2: 0 };
    p.lostRounds = 0;
    p.points = 0;
  });
  gameData.inGamePlayers = [];
  gameData.activePlayers = 0;
  gameData.winner = null;
  gameData.looser = null;
  gameData.totalCoins = null;

  if (roomData.game.players.length < 5) roomData.status = "open";

  roomData.game = gameData;
  roomData.markModified("game");
  await roomData.save();

  return { event: "stopRes", data: roomData };
}

/* ------------------------------------------------------------------ *
 * messageSent
 * ------------------------------------------------------------------ */

export async function annotateMsg(
  text: string,
  data: IWsData,
): Promise<WsResult> {
  const roomData = await RoomModel.findOne({ roomName: data.roomName });
  if (!roomData) throw new WsError("non_existing_room");

  roomData.messages.push({
    fromUser: data.playerName,
    text,
    timeSent: new Date(),
  });
  roomData.markModified("messages");
  await roomData.save();

  return { event: "addMessage", data: roomData };
}

/* ------------------------------------------------------------------ *
 * disconnect
 * ------------------------------------------------------------------ */

export async function disconnectUser(
  data: IWsData,
  throwWs = false,
): Promise<WsResult> {
  let roomData: RoomDoc | null = null;

  for (;;) {
    if (roomLocked.includes(data.roomName)) {
      await waitTick();
      continue;
    }

    lockRoom(data.roomName);
    try {
      roomData = await RoomModel.findOne({ roomName: data.roomName }).setOptions(
        { sanitizeFilter: true },
      );

      if (roomData) {
        const gameData = roomData.game;
        const ix = gameData.players.findIndex((p) => p.name === data.playerName);
        if (ix !== -1) {
          gameData.players[ix]!.online = false;
          gameData.players[ix]!.socketId = "";
          if (gameData.status !== "waitingStart") {
            if (!gameData.usersReconn.includes(data.playerName))
              gameData.usersReconn.push(data.playerName);
            gameData.gameInPause = true;
          }
          roomData.game = gameData;
          roomData.markModified("game");
          await roomData.save();
        } else if (throwWs) {
          throw new WsError("already_disconnected");
        }
      } else if (throwWs) {
        throw new WsError("non_existing_room");
      }
    } finally {
      unlockRoom(data.roomName);
    }

    return { event: "userSync", data: roomData };
  }
}

/* ------------------------------------------------------------------ *
 * JWT (ws_chgame cookie) helpers
 * ------------------------------------------------------------------ */

function parseCookie(header: string, name: string): string | null {
  const prefix = `${name}=`;
  const begin = header.indexOf(prefix);
  if (begin === -1) return null;
  let end = header.indexOf(";", begin);
  if (end === -1) end = header.length;
  return header.slice(begin + prefix.length, end);
}

/**
 * Resolves the { playerName, roomName } bound to a ws_chgame cookie.
 * On an expired token it removes the player from the room (exitRoom) and
 * returns null, mirroring the original gateway behaviour.
 */
export async function getWsDataFromCookie(
  cookieHeader: string | null | undefined,
): Promise<IWsData | null> {
  if (!cookieHeader) return null;

  const token = parseCookie(cookieHeader, "ws_chgame");
  if (!token) return null;

  const secret = serverConfig.jwtWsSecret();
  if (!secret) return null;

  try {
    const payload = jwt.verify(token, secret) as {
      userName?: string;
      sub?: string;
    };
    if (payload.userName && payload.sub) {
      return { playerName: payload.userName, roomName: payload.sub };
    }
    return null;
  } catch (err) {
    if ((err as Error).name === "TokenExpiredError") {
      try {
        const payload = jwt.verify(token, secret, {
          ignoreExpiration: true,
        }) as { userName?: string; sub?: string };
        if (payload.userName && payload.sub) {
          await exitRoom(payload.userName, payload.sub);
        }
      } catch {
        // ignore
      }
    }
    return null;
  }
}

export async function exitRoom(
  playerName: string,
  roomName: string,
): Promise<void> {
  const room = await RoomModel.findOne({ roomName }).setOptions({
    sanitizeFilter: true,
  });
  if (!room) return;

  if (room.game.status !== "waitingStart") {
    await gameStop({ roomName, playerName });
  }

  const ix = room.game.players.findIndex((p) => p.name === playerName);
  if (ix !== -1) room.game.players.splice(ix, 1);

  if (room.game.players.length === 0 && room.roomType === "public") {
    await RoomModel.deleteOne({ roomName }).setOptions({ sanitizeFilter: true });
  } else {
    room.markModified("game");
    await room.save();
  }
}
