/** Server-side reconnection window per disconnected player (single Node process). */

export const RECONN_INTERVAL_MS = 10_000;
export const MAX_SERVER_RECONN_ATTEMPTS = 5;

type TimeoutHandler = (roomName: string, playerName: string) => Promise<void>;

const timers = new Map<string, ReturnType<typeof setTimeout>>();
let timeoutHandler: TimeoutHandler | null = null;

function timerKey(roomName: string, playerName: string): string {
  return `${roomName}:${playerName}`;
}

export function setReconnTimeoutHandler(handler: TimeoutHandler): void {
  timeoutHandler = handler;
}

export function schedulePlayerReconn(roomName: string, playerName: string): void {
  cancelPlayerReconn(roomName, playerName);

  const key = timerKey(roomName, playerName);
  const timer = setTimeout(() => {
    timers.delete(key);
    void timeoutHandler?.(roomName, playerName);
  }, RECONN_INTERVAL_MS);

  timers.set(key, timer);
}

export function cancelPlayerReconn(roomName: string, playerName: string): void {
  const key = timerKey(roomName, playerName);
  const timer = timers.get(key);
  if (timer) {
    clearTimeout(timer);
    timers.delete(key);
  }
}

export function cancelRoomReconn(roomName: string): void {
  for (const key of [...timers.keys()]) {
    if (!key.startsWith(`${roomName}:`)) continue;
    const timer = timers.get(key);
    if (timer) clearTimeout(timer);
    timers.delete(key);
  }
}

export function scheduleOfflinePlayersReconn(
  roomName: string,
  playerNames: string[],
): void {
  for (const name of playerNames) {
    schedulePlayerReconn(roomName, name);
  }
}
