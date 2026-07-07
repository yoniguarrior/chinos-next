"use client";

import { useEffect, useState } from "react";

/**
 * False during SSR and the hydration pass; true after mount.
 * Use to gate client-only UI (auth state, etc.) and avoid hydration mismatches.
 */
export function useClientReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return ready;
}
