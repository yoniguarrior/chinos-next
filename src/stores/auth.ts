import { create } from "zustand";
import type { User } from "@/types/auth";
import type { LoginPayload } from "@/types/auth";
import { createApi } from "@/lib/api";
import { getLocalState, setLocalState } from "@/lib/local-state";
import { useErrorStore } from "./error";

/**
 * Auth store (port of the Pinia auth store + useAuth composable):
 * holds { userId, userName, accessToken } and handles login / logout /
 * silent refresh via the `ksa_lch` HttpOnly cookie.
 */

const EMPTY_USER: User = { userId: "", userName: "", accessToken: "" };

function isTokenExpiredOrEmpty(token: string): boolean {
  if (token === "") return false;
  try {
    return (
      Date.now() >= JSON.parse(atob(token.split(".")[1] || "")).exp * 1000
    );
  } catch {
    return true;
  }
}

interface AuthState {
  user: User;
  isReady: boolean;
  isLogged: () => boolean;
  setUser: (userData: User) => void;
  reset: () => void;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  /** Hydrates the session on app mount (refresh if token empty/expired). */
  getUser: () => Promise<User>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: { ...EMPTY_USER },
  isReady: false,

  isLogged: () => get().user.userId !== "",

  setUser: (userData) => {
    set({ user: { ...userData } });
    setLocalState({ logged: userData.userId !== "" });
  },

  reset: () => {
    setLocalState({ logged: false });
    set({ user: { ...EMPTY_USER } });
  },

  login: async (payload) => {
    const error = useErrorStore.getState();
    const { post } = createApi("/users/login");

    try {
      const loggedUser = await post<{ data: User }>(payload);
      get().setUser(loggedUser.data);
      error.reset();
    } catch (e) {
      get().reset();
      error.setError(e);
      if (!useErrorStore.getState().details) {
        useErrorStore.setState({ details: "auth_fail" });
      }
      throw e;
    }
  },

  refreshToken: async () => {
    const error = useErrorStore.getState();
    const { get: apiGet } = createApi("/users/refacctk");

    try {
      const loggedUser = await apiGet<{ data: User }>();
      get().setUser(loggedUser.data);
      error.reset();
    } catch (e) {
      get().reset();
      error.setError(e);
    }
  },

  logout: async () => {
    const error = useErrorStore.getState();
    const { user } = get();

    if (user.accessToken !== "") {
      const { post } = createApi("/users/logout", user.accessToken);
      try {
        await post();
        error.reset();
      } catch (e) {
        const err = e as { statusCode?: number };
        // If session timed out (401), retry with a fresh token.
        if (err.statusCode === 401) {
          try {
            await get().refreshToken();
            const retry = createApi("/users/logout", get().user.accessToken);
            await retry.post();
            error.reset();
          } catch (e2) {
            error.setError(e2);
          }
        } else {
          error.setError(e);
        }
      }
    }

    get().reset();

    if (useErrorStore.getState().status !== "") {
      return Promise.reject(useErrorStore.getState().message);
    }
  },

  getUser: async () => {
    if (getLocalState().logged) {
      if (isTokenExpiredOrEmpty(get().user.accessToken)) {
        await get().refreshToken();
      }
    }
    set({ isReady: true });
    return get().user;
  },
}));
