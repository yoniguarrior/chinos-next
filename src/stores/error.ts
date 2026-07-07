import { create } from "zustand";

/**
 * Error store (port of the Pinia error store): normalizes API and
 * WebSocket errors into { status, message, details }.
 */

interface ErrorState {
  status: string;
  message: string;
  details: string;
  setError: (error: unknown) => void;
  setWsError: (code: string) => void;
  reset: () => void;
}

function normalizeDetails(raw: string): string {
  return raw ? raw.toLowerCase().replace(/ /g, "_") : "";
}

function extractErrorCode(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const payload = data as { error?: string | string[] };
  const code = Array.isArray(payload.error) ? payload.error[0] : payload.error;
  return typeof code === "string" ? code : "";
}

export const useErrorStore = create<ErrorState>((set) => ({
  status: "",
  message: "",
  details: "",

  setError: (error) => {
    if (error && typeof error === "object") {
      const err = error as {
        statusCode?: number;
        message?: string;
        data?: { error?: string | string[] };
      };

      if (err.statusCode) {
        set({
          status: String(err.statusCode),
          message: err.message ?? "",
          details: normalizeDetails(extractErrorCode(err.data)),
        });
        return;
      }
    }

    set({
      status: "500",
      message: error instanceof Error ? error.message : "API request failed",
      details: "unknown_error",
    });
  },

  setWsError: (code) => {
    set({ status: "ws", message: code, details: code });
  },

  reset: () => set({ status: "", message: "", details: "" }),
}));

export function errorIsEmpty(state: Pick<ErrorState, "status">): boolean {
  return state.status === "";
}
