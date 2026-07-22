import jwt from "jsonwebtoken";
import type { HydratedDocument } from "mongoose";
import { RoomModel, type Game, type Player, type Room } from "../../models/room";
import { UserModel } from "../../models/user";
import { RankingModel } from "../../models/ranking";
import { serverConfig } from "./config";
import { ensureRoomGame, syncRoomStatus } from "./rooms";
import {
  cancelPlayerReconn,
  cancelRoomReconn,
  scheduleOfflinePlayersReconn,
  schedulePlayerReconn,
  setReconnTimeoutHandler,
} from "./reconn-timer";
import {
  cancelRoomIdle,
  scheduleRoomIdle,
  setIdleTimeoutHandler,
  touchRoomIdle,
} from "./idle-timer";
import { pushToRoom } from "./ws-peers";

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

function ensureReconnFields(gameData: Game): void {
  if (gameData.reconnFailed === undefined) gameData.reconnFailed = false;
  if (gameData.reconnAttempt === undefined) gameData.reconnAttempt = 0;
}

function rebuildUsersReconn(gameData: Game): void {
  gameData.usersReconn = gameData.players
    .filter((p) => !p.online)
    .map((p) => p.name);
}

function clearReconnState(gameData: Game): void {
  gameData.gameInPause = false;
  gameData.usersReconn = [];
  gameData.reconnFailed = false;
  gameData.reconnAttempt = 0;
}

function clearPendingTable(gameData: Game): void {
  for (const p of gameData.players) {
    p.pendingTable = false;
  }
}

function isLobbyOrNewRound(status: Game["status"]): boolean {
  return status === "waitingStart" || status === "waitingNewRound";
}

function isMidGameStatus(status: Game["status"]): boolean {
  return !isLobbyOrNewRound(status);
}

/** Provisional id from HTTP `/rooms/sync` — must not override a live WS session. */
function isHttpSocketId(socketId: string | undefined | null): boolean {
  return Boolean(socketId && socketId.startsWith("http-"));
}

/**
 * Persist + remove players, clear hand, then waitingNewRound (≥2, stats kept)
 * or waitingStart (≤1, persist last remaining). Shared by abandon and idle timeout.
 */
async function removePlayersAndSettle(
  roomData: RoomDoc,
  namesToRemove: string[],
): Promise<WsResult> {
  const gameData = roomData.game;
  const roomName = roomData.roomName;

  for (const name of namesToRemove) {
    const ix = gameData.players.findIndex((p) => p.name === name);
    if (ix === -1) continue;
    await persistPlayerStats(gameData.players[ix]!);
    cancelPlayerReconn(roomName, name);
    gameData.players.splice(ix, 1);
  }

  clearReconnState(gameData);
  cancelRoomReconn(roomName);
  cancelRoomIdle(roomName);
  clearPendingTable(gameData);

  for (const p of gameData.players) {
    resetHandFields(p);
  }

  gameData.inGamePlayers = [];
  gameData.activePlayers = 0;
  gameData.winner = null;
  gameData.looser = null;
  gameData.totalCoins = null;
  gameData.playerStart = 0;
  gameData.playerInTurn = 0;

  if (gameData.players.length >= 2) {
    gameData.status = "waitingNewRound";
  } else if (gameData.players.length === 1) {
    await persistPlayerStats(gameData.players[0]!);
    resetSessionStats(gameData.players[0]!);
    gameData.status = "waitingStart";
  } else {
    gameData.status = "waitingStart";
  }

  roomData.game = gameData;
  syncRoomStatus(roomData);
  roomData.markModified("game");
  await roomData.save();

  return {
    event: "stopRes",
    data: roomToClientPayload(roomData),
  };
}

function resetHandFields(p: Player): void {
  p.bet = null;
  p.coins = null;
  p.lifted = true;
  p.saved = false;
}

function resetSessionStats(p: Player): void {
  p.playedRounds = 0;
  p.wonRounds = { first: 0, won5: 0, won4: 0, won3: 0, won2: 0 };
  p.lostRounds = 0;
  p.points = 0;
}

/** Persist one player's session stats to User + Ranking (skips guests). */
export async function persistPlayerStats(p: Player): Promise<void> {
  if (!p.playedRounds && !p.points && !p.lostRounds) {
    const won =
      p.wonRounds &&
      (p.wonRounds.first ||
        p.wonRounds.won5 ||
        p.wonRounds.won4 ||
        p.wonRounds.won3 ||
        p.wonRounds.won2);
    if (!won) return;
  }

  const user = await UserModel.findOne({ userName: p.name }).setOptions({
    sanitizeFilter: true,
  });
  if (!user) return;

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

function assertGameNotPaused(gameData: Game): void {
  if (gameData.gameInPause) throw new WsError("game_in_pause");
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
      ensureReconnFields(gameData);
      const playerIx = gameData.players.findIndex(
        (p) => p.name === data.playerName,
      );

      if (playerIx !== -1) {
        cancelPlayerReconn(data.roomName, data.playerName);
        gameData.players[playerIx]!.online = true;
        // HTTP sync uses a throwaway `http-…` id; never clobber a live WS peer id
        // or disconnectUser will treat the real socket close as stale and skip
        // notifying the rest of the room.
        const currentId = gameData.players[playerIx]!.socketId;
        if (
          !isHttpSocketId(socketId) ||
          !currentId ||
          isHttpSocketId(currentId)
        ) {
          gameData.players[playerIx]!.socketId = socketId;
        }
        if (gameData.gameInPause || gameData.reconnFailed) {
          rebuildUsersReconn(gameData);
          if (gameData.usersReconn.length === 0) {
            clearReconnState(gameData);
          }
        }
        if (isMidGameStatus(gameData.status)) {
          touchRoomIdle(data.roomName);
        }
      } else if (gameData.status !== "waitingStart") {
        // Mid-game: only existing seats (incl. pendingTable) may sync.
        throw new WsError("game_in_play");
      } else {
        gameData.players.push({
          name: data.playerName,
          online: true,
          socketId,
          saved: false,
          pendingTable: false,
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

  const gameData = roomData.game;

  const connected = gameData.players.filter(
    (p) => p.online === true && !p.pendingTable,
  );

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

  // Keep pending mid-join seats; rebuild active seats from connected.
  const pending = gameData.players.filter((p) => p.pendingTable);
  gameData.players = [];
  order.forEach((p) => {
    gameData.players.push({
      name: connected[p]!.name,
      online: connected[p]!.online,
      socketId: connected[p]!.socketId,
      saved: false,
      pendingTable: false,
      coins: null,
      bet: null,
      lifted: true,
      playedRounds: 0,
      wonRounds: { first: 0, won5: 0, won4: 0, won3: 0, won2: 0 },
      lostRounds: 0,
      points: 0,
    } as Player);
  });
  for (const p of pending) {
    if (!gameData.players.some((x) => x.name === p.name)) {
      gameData.players.push({ ...p, saved: true, pendingTable: true });
    }
  }

  gameData.playerStart = 0;
  gameData.playerInTurn = 0;
  gameData.status = "takingCoins";
  gameData.winner = null;
  gameData.looser = null;
  gameData.usersReconn = [];
  gameData.inGamePlayers = [];
  gameData.players
    .filter((p) => !p.saved && !p.pendingTable)
    .forEach((player) => gameData.inGamePlayers.push(player.name));
  gameData.activePlayers = gameData.inGamePlayers.length;
  clearReconnState(gameData);
  cancelRoomReconn(data.roomName);

  roomData.game = gameData;
  syncRoomStatus(roomData);
  roomData.markModified("game");
  await roomData.save();

  scheduleRoomIdle(data.roomName);

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
  assertGameNotPaused(gameData);
  const ix = gameData.players.findIndex((p) => p.name === data.playerName);
  if (ix === -1) throw new WsError("player_not_in_game");
  if (gameData.players[ix]!.pendingTable) throw new WsError("player_not_in_game");

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

  touchRoomIdle(data.roomName);

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
  assertGameNotPaused(gameData);
  const ix = gameData.players.findIndex((p) => p.name === data.playerName);
  if (ix === -1) throw new WsError("player_not_in_game");
  if (gameData.players[ix]!.pendingTable) throw new WsError("player_not_in_game");

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

  touchRoomIdle(data.roomName);

  return { event: "gameUpdate", data: roomData };
}

/* ------------------------------------------------------------------ *
 * showCoins
 * ------------------------------------------------------------------ */

export async function showCoins(data: IWsData): Promise<WsResult> {
  const roomData = await RoomModel.findOne({ roomName: data.roomName });
  if (!roomData) throw new WsError("non_existing_room");

  const gameData = roomData.game;
  assertGameNotPaused(gameData);
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

  touchRoomIdle(data.roomName);

  return { event: "gameUpdate", data: roomData };
}

/* ------------------------------------------------------------------ *
 * closeHand
 * ------------------------------------------------------------------ */

export async function closeHand(data: IWsData): Promise<WsResult> {
  const roomData = await RoomModel.findOne({ roomName: data.roomName });
  if (!roomData) throw new WsError("non_existing_room");

  const gameData = roomData.game;
  assertGameNotPaused(gameData);

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

  touchRoomIdle(data.roomName);

  return { event: "gameUpdate", data: roomData };
}

/* ------------------------------------------------------------------ *
 * closeRound
 * ------------------------------------------------------------------ */

export async function closeRound(data: IWsData): Promise<WsResult> {
  const roomData = await RoomModel.findOne({ roomName: data.roomName });
  if (!roomData) throw new WsError("non_existing_room");

  const gameData = roomData.game;
  assertGameNotPaused(gameData);

  gameData.players[gameData.looser!]!.lostRounds += 1;
  gameData.playerInTurn = gameData.looser!;
  gameData.players.forEach((p) => {
    if (!p.pendingTable) p.playedRounds += 1;
  });
  gameData.status = "waitingNewRound";
  clearPendingTable(gameData);

  roomData.game = gameData;
  roomData.markModified("game");
  await roomData.save();

  cancelRoomIdle(data.roomName);

  return { event: "gameUpdate", data: roomData };
}

/* ------------------------------------------------------------------ *
 * selectNext
 * ------------------------------------------------------------------ */

export async function selectNext(data: IWsData): Promise<WsResult> {
  const roomData = await RoomModel.findOne({ roomName: data.roomName });
  if (!roomData) throw new WsError("non_existing_room");

  assertGameNotPaused(roomData.game);

  roomData.game.status = "selectingNext";
  roomData.markModified("game");
  await roomData.save();

  touchRoomIdle(data.roomName);

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
  assertGameNotPaused(gameData);
  const startIx = gameData.players.findIndex((p) => p.name === playerStart);

  gameData.status = "takingCoins";
  gameData.playerStart = startIx;
  gameData.playerInTurn = startIx;
  gameData.inGamePlayers = [];
  clearPendingTable(gameData);
  gameData.players.forEach((p) => {
    resetHandFields(p);
    gameData.inGamePlayers.push(p.name);
  });
  gameData.activePlayers = gameData.inGamePlayers.length;
  gameData.winner = null;
  gameData.looser = null;
  gameData.totalCoins = null;

  roomData.game = gameData;
  syncRoomStatus(roomData);
  roomData.markModified("game");
  await roomData.save();

  scheduleRoomIdle(data.roomName);

  return { event: "gameUpdate", data: roomData };
}

/* ------------------------------------------------------------------ *
 * gameStop
 * ------------------------------------------------------------------ */

export async function gameStop(data: IWsData): Promise<WsResult> {
  const roomData = await RoomModel.findOne({ roomName: data.roomName });
  if (!roomData) throw new WsError("non_existing_room");

  const gameData = roomData.game;

  for (const p of gameData.players) {
    await persistPlayerStats(p);
  }

  gameData.status = "waitingStart";
  gameData.playerStart = 0;
  gameData.playerInTurn = 0;
  gameData.players.forEach((p) => {
    resetHandFields(p);
    resetSessionStats(p);
    p.pendingTable = false;
  });
  gameData.inGamePlayers = [];
  gameData.activePlayers = 0;
  gameData.winner = null;
  gameData.looser = null;

  clearReconnState(gameData);
  cancelRoomReconn(data.roomName);
  cancelRoomIdle(data.roomName);

  roomData.game = gameData;
  syncRoomStatus(roomData);

  roomData.markModified("game");
  await roomData.save();

  return { event: "stopRes", data: roomData };
}

/**
 * Peer abandon after reconnection failure (in-game).
 * Persists stats for disconnected players, removes them, then either keeps
 * remaining players on waitingNewRound (stats conserved) or waitingStart
 * (persist last remaining).
 */
export async function gameAbandon(data: IWsData): Promise<WsResult> {
  const roomData = await RoomModel.findOne({ roomName: data.roomName });
  if (!roomData) throw new WsError("non_existing_room");

  const gameData = roomData.game;

  if (gameData.status === "waitingStart") {
    return { event: "stopRes", data: roomToClientPayload(roomData) };
  }

  ensureReconnFields(gameData);
  rebuildUsersReconn(gameData);

  const toRemove = [...gameData.usersReconn];
  if (toRemove.length === 0) {
    return { event: "stopRes", data: roomToClientPayload(roomData) };
  }

  return removePlayersAndSettle(roomData, toRemove);
}

/**
 * 30 minutes without game activity while a hand/round is in progress (or paused
 * for reconnection): remove the blocking player(s), persist their stats, and
 * send the rest to Nueva partida (≥2) or waitingStart (1).
 */
export async function processIdleTimeout(
  roomName: string,
): Promise<WsResult | null> {
  for (;;) {
    if (roomLocked.includes(roomName)) {
      await waitTick();
      continue;
    }

    lockRoom(roomName);
    try {
      const roomData = await RoomModel.findOne({ roomName }).setOptions({
        sanitizeFilter: true,
      });
      if (!roomData) return null;

      const gameData = roomData.game;
      ensureReconnFields(gameData);

      const paused = Boolean(gameData.gameInPause);
      if (!paused && !isMidGameStatus(gameData.status)) {
        return null;
      }

      let toRemove: string[] = [];
      if (paused) {
        rebuildUsersReconn(gameData);
        toRemove = [...gameData.usersReconn];
      } else {
        const turn = gameData.players[gameData.playerInTurn];
        if (turn && !turn.pendingTable) {
          toRemove = [turn.name];
        }
      }

      if (toRemove.length === 0) return null;

      return await removePlayersAndSettle(roomData, toRemove);
    } finally {
      unlockRoom(roomName);
    }
  }
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
  /** Peer id of the closing socket; ignored if a newer connection already synced. */
  socketId?: string,
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
        ensureReconnFields(gameData);
        const ix = gameData.players.findIndex((p) => p.name === data.playerName);
        if (ix !== -1) {
          const player = gameData.players[ix]!;
          // Stale close after a faster reconnect: keep the new session.
          // Provisional HTTP ids must not block a real WebSocket disconnect.
          if (
            socketId &&
            player.socketId &&
            player.socketId !== socketId &&
            !isHttpSocketId(player.socketId)
          ) {
            return { event: "userSync", data: null };
          }

          player.online = false;
          player.socketId = "";
          if (!gameData.usersReconn.includes(data.playerName)) {
            gameData.usersReconn.push(data.playerName);
          }
          gameData.gameInPause = true;
          gameData.reconnFailed = false;
          gameData.reconnAttempt = 0;
          schedulePlayerReconn(data.roomName, data.playerName);
          // Keep a 30m backstop if peers never abandon a mid-game pause.
          if (isMidGameStatus(gameData.status)) {
            scheduleRoomIdle(data.roomName);
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

    return {
      event: "userSync",
      data: roomData ? roomToClientPayload(roomData) : null,
    };
  }
}

/* ------------------------------------------------------------------ *
 * Reconnection timeout / retry (server-side retry windows)
 * ------------------------------------------------------------------ */

export async function processReconnTimeout(
  roomName: string,
  playerName: string,
): Promise<WsResult | null> {
  for (;;) {
    if (roomLocked.includes(roomName)) {
      await waitTick();
      continue;
    }

    lockRoom(roomName);
    let roomData: RoomDoc | null = null;
    try {
      roomData = await RoomModel.findOne({ roomName }).setOptions({
        sanitizeFilter: true,
      });
      if (!roomData) return null;

      const gameData = roomData.game;
      ensureReconnFields(gameData);

      const player = gameData.players.find((p) => p.name === playerName);
      if (!player || player.online) {
        return null;
      }

      // Lobby / waitingNewRound (2C): one window, then kick + persist.
      if (isLobbyOrNewRound(gameData.status)) {
        await persistPlayerStats(player);
        cancelPlayerReconn(roomName, playerName);
        const ix = gameData.players.findIndex((p) => p.name === playerName);
        if (ix !== -1) gameData.players.splice(ix, 1);

        gameData.usersReconn = gameData.usersReconn.filter(
          (n) => n !== playerName,
        );
        if (gameData.usersReconn.length === 0) {
          clearReconnState(gameData);
        }

        if (
          gameData.status === "waitingNewRound" &&
          gameData.players.length === 1
        ) {
          await persistPlayerStats(gameData.players[0]!);
          resetSessionStats(gameData.players[0]!);
          resetHandFields(gameData.players[0]!);
          gameData.status = "waitingStart";
          gameData.inGamePlayers = [];
          gameData.activePlayers = 0;
          clearReconnState(gameData);
          cancelRoomReconn(roomName);
        } else if (gameData.players.length === 0) {
          gameData.status = "waitingStart";
          clearReconnState(gameData);
        }

        roomData.game = gameData;
        syncRoomStatus(roomData);

        if (gameData.players.length === 0 && roomData.roomType === "public") {
          await RoomModel.deleteOne({ roomName }).setOptions({
            sanitizeFilter: true,
          });
          return { event: "userSync", data: null };
        }

        roomData.markModified("game");
        await roomData.save();

        return {
          event: "userSync",
          data: roomToClientPayload(roomData),
        };
      }

      // In-game: mark reconnection failed (peers may retry or abandon).
      if (!gameData.usersReconn.includes(playerName)) {
        gameData.usersReconn.push(playerName);
      }
      gameData.gameInPause = true;
      gameData.reconnAttempt += 1;
      gameData.reconnFailed = true;

      roomData.game = gameData;
      roomData.markModified("game");
      await roomData.save();
    } finally {
      unlockRoom(roomName);
    }

    return {
      event: "userSync",
      data: roomData ? roomToClientPayload(roomData) : null,
    };
  }
}

export async function retryReconn(data: IWsData): Promise<WsResult> {
  const roomData = await RoomModel.findOne({ roomName: data.roomName });
  if (!roomData) throw new WsError("non_existing_room");

  const gameData = roomData.game;
  ensureReconnFields(gameData);

  if (!gameData.reconnFailed || !gameData.gameInPause) {
    throw new WsError("reconn_not_failed");
  }

  gameData.reconnFailed = false;
  gameData.reconnAttempt = 0;

  const offline = gameData.usersReconn.filter((name) => {
    const p = gameData.players.find((pl) => pl.name === name);
    return p && !p.online;
  });

  roomData.game = gameData;
  roomData.markModified("game");
  await roomData.save();

  scheduleOfflinePlayersReconn(data.roomName, offline);

  return { event: "userSync", data: roomToClientPayload(roomData) };
}

setReconnTimeoutHandler(async (roomName, playerName) => {
  try {
    const result = await processReconnTimeout(roomName, playerName);
    if (result?.data) {
      pushToRoom(roomName, result.event, result.data);
    }
  } catch (err) {
    console.error("[reconn] timeout error:", err);
  }
});

setIdleTimeoutHandler(async (roomName) => {
  try {
    const result = await processIdleTimeout(roomName);
    if (result?.data) {
      pushToRoom(roomName, result.event, result.data);
    }
  } catch (err) {
    console.error("[idle] timeout error:", err);
  }
});

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
 * Expired/invalid tokens return null without removing the player — they stay
 * offline in the room so reconnection (or an explicit leave/abandon) can run.
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
  } catch {
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
