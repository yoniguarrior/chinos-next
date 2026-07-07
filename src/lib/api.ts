/**
 * API client (equivalent to the Nuxt `useApi` composable): same-origin
 * fetch with credentials, optional Bearer header and NestJS-style error
 * normalization (the server returns `{ statusCode, error, ... }` on failure).
 */

export interface ApiError extends Error {
  statusCode?: number;
  data?: unknown;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api";

async function request<T>(url: string, options: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: "include", ...options });
  } catch (err) {
    const apiError: ApiError = new Error(
      err instanceof Error ? err.message : "API request failed",
    );
    throw apiError;
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // empty or non-JSON body
  }

  if (!res.ok) {
    let message = "API request failed";
    if (body && typeof body === "object" && "error" in body) {
      const code = (body as { error?: string | string[] }).error;
      message = Array.isArray(code) ? (code[0] ?? message) : (code ?? message);
    }
    const apiError: ApiError = new Error(message);
    apiError.statusCode = res.status;
    apiError.data = body;
    throw apiError;
  }

  return body as T;
}

export function useApi(endpoint: string, accessToken?: string) {
  const url = `${API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const get = async <T>(query?: Record<string, string | number | boolean>) => {
    const queryString = query
      ? `?${new URLSearchParams(
          Object.fromEntries(
            Object.entries(query).map(([k, v]) => [k, String(v)]),
          ),
        ).toString()}`
      : "";
    return request<T>(`${url}${queryString}`, { method: "GET", headers });
  };

  const post = async <T>(payload?: Record<string, unknown>) => {
    return request<T>(url, {
      method: "POST",
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
    });
  };

  const patch = async <T>(payload?: Record<string, unknown>) => {
    return request<T>(url, {
      method: "PATCH",
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
    });
  };

  const del = async <T>() => {
    return request<T>(url, { method: "DELETE", headers });
  };

  return { get, post, patch, del };
}
