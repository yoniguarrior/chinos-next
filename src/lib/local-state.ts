/**
 * Local storage state shared with the PWA back-button handling
 * (equivalent to the Nuxt `useGlobalLocal` store).
 */

const KEY = "global-local-state";

export interface LocalState {
  room: string;
  logged: boolean;
}

const DEFAULT_STATE: LocalState = { room: "", logged: false };

export function getLocalState(): LocalState {
  if (typeof window === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<LocalState>) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function setLocalState(patch: Partial<LocalState>): void {
  if (typeof window === "undefined") return;
  const next = { ...getLocalState(), ...patch };
  window.localStorage.setItem(KEY, JSON.stringify(next));
}
