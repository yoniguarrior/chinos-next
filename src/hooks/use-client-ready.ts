"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Returns false during SSR/hydration and true after the component is
 * mounted on the client (hydration-safe, no extra render cascade).
 */
export function useClientReady(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
