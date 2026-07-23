"use client";

import { useEffect, useRef, type RefObject } from "react";
import { usePathname, useRouter } from "next/navigation";

const BLOCK_STATE = { roomBackTrap: true } as const;

interface UseRoomExitGuardOptions {
  gameInPlay: boolean;
  /** Set to true while leaving via the in-app flow (skips unload handling). */
  exitingViaAppRef: RefObject<boolean>;
}

/**
 * While inside a room, blocks the browser / PWA back button and warns before
 * closing the tab when a game is in progress.
 *
 * Intentionally does NOT call /rooms/leave on pagehide/unload: a reload or
 * lost connection must keep the player in the room (offline) so reconnection
 * can resume the game. Explicit leave/abandon only happens via the in-app UI.
 */
export function useRoomExitGuard({
  gameInPlay,
  exitingViaAppRef,
}: UseRoomExitGuardOptions): void {
  const pathname = usePathname();
  const router = useRouter();
  const gameInPlayRef = useRef(gameInPlay);
  const stayPathRef = useRef(pathname);

  useEffect(() => {
    gameInPlayRef.current = gameInPlay;
  }, [gameInPlay]);

  useEffect(() => {
    stayPathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const pushTrap = (path = stayPathRef.current) => {
      window.history.pushState(BLOCK_STATE, "", path);
    };

    pushTrap();
    pushTrap();

    const onPopState = () => {
      const stayOn = stayPathRef.current;
      pushTrap(stayOn);
      pushTrap(stayOn);
      if (window.location.pathname !== stayOn) {
        router.replace(stayOn);
      }
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (exitingViaAppRef.current) return;
      if (!gameInPlayRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [exitingViaAppRef, pathname, router]);
}
