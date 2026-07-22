/**
 * Room-level idle timer while a hand/round is in progress.
 * After IDLE_TIMEOUT_MS without game activity, the blocking player is removed
 * in an orderly way (stats + waitingNewRound) — not a cookie/JWT crash.
 */

/** Same duration the old ws_chgame cookie used (30 minutes). */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

type IdleHandler = (roomName: string) => Promise<void>;

const timers = new Map<string, ReturnType<typeof setTimeout>>();
let idleHandler: IdleHandler | null = null;

export function setIdleTimeoutHandler(handler: IdleHandler): void {
  idleHandler = handler;
}

export function scheduleRoomIdle(roomName: string): void {
  cancelRoomIdle(roomName);
  const timer = setTimeout(() => {
    timers.delete(roomName);
    void idleHandler?.(roomName);
  }, IDLE_TIMEOUT_MS);
  timers.set(roomName, timer);
}

/** Reset the 30m window (call on real game activity, not keepalive pings). */
export function touchRoomIdle(roomName: string): void {
  if (!timers.has(roomName)) return;
  scheduleRoomIdle(roomName);
}

export function cancelRoomIdle(roomName: string): void {
  const timer = timers.get(roomName);
  if (!timer) return;
  clearTimeout(timer);
  timers.delete(roomName);
}
