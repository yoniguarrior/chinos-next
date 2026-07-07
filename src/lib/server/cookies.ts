import type { NextResponse } from "next/server";
import { serverConfig } from "./config";

export const REFRESH_COOKIE = "ksa_lch";
export const WS_COOKIE = "ws_chgame";

function secondsFrom(expiration: string): number {
  const n = parseInt(expiration, 10);
  return Number.isFinite(n) ? n : 0;
}

function baseCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
  };
}

export function getCookieFromRequest(
  req: Request,
  name: string,
): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  const prefix = `${name}=`;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return undefined;
}

export function setRefreshCookie(res: NextResponse, token: string): void {
  res.cookies.set(REFRESH_COOKIE, token, {
    ...baseCookieOptions(),
    maxAge: secondsFrom(serverConfig.jwtRefreshExpiration()),
  });
}

export function clearRefreshCookie(res: NextResponse): void {
  res.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
}

export function getRefreshCookie(req: Request): string | undefined {
  return getCookieFromRequest(req, REFRESH_COOKIE);
}

export function setWsCookie(res: NextResponse, token: string): void {
  res.cookies.set(WS_COOKIE, token, {
    ...baseCookieOptions(),
    maxAge: secondsFrom(serverConfig.jwtWsExpiration()),
  });
}

export function clearWsCookie(res: NextResponse): void {
  res.cookies.set(WS_COOKIE, "", { path: "/", maxAge: 0 });
}

export function getWsCookie(req: Request): string | undefined {
  return getCookieFromRequest(req, WS_COOKIE);
}
