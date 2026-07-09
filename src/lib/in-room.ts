import { getLocalState } from "@/lib/local-state";

/** True when the user is on an active game room page (not join/create). */
export function isInRoom(pathname?: string): boolean {
  if (typeof window === "undefined") return false;
  const path = pathname ?? window.location.pathname;
  if (/^\/rooms\/(join|create)(\/|$)/.test(path)) return false;
  if (/^\/rooms\/[^/]+$/.test(path)) return true;
  return Boolean(getLocalState().room);
}
