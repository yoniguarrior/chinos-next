"use client";

import { useEffect, useRef, type RefObject } from "react";
import { getLocalState, setLocalState } from "@/lib/local-state";

const BLOCK_STATE = { roomBackTrap: true } as const;

interface UseRoomExitGuardOptions {
  gameInPlay: boolean;
  /** Set to true while leaving via the in-app flow to skip the unload beacon. */
  exitingViaAppRef: RefObject<boolean>;
}

/**
 * While inside a room, blocks the browser / PWA back button and warns before
 * closing the tab when a game is in progress. On confirmed tab close, a beacon
 * abandons the game (if needed) and removes the player from the room.
 */
export function useRoomExitGuard({
  gameInPlay,
  exitingViaAppRef,
}: UseRoomExitGuardOptions): void {
  const gameInPlayRef = useRef(gameInPlay);

  useEffect(() => {
    gameInPlayRef.current = gameInPlay;
  }, [gameInPlay]);

  useEffect(() => {
    const pushTrap = () => {
      window.history.pushState(BLOCK_STATE, "", window.location.href);
    };

    pushTrap();

    const onPopState = () => {
      pushTrap();
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!gameInPlayRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const onPageHide = (event: PageTransitionEvent) => {
      if (event.persisted) return;
      if (exitingViaAppRef.current) return;
      if (!getLocalState().room) return;

      const body = JSON.stringify({ abandon: gameInPlayRef.current });
      const blob = new Blob([body], { type: "application/json" });
      const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "/api";
      const url = `${apiBase.startsWith("/") ? apiBase : `/${apiBase}`}/rooms/leave`;
      navigator.sendBeacon(url, blob);
      setLocalState({ room: "" });
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [exitingViaAppRef]);
}
