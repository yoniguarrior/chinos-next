import jwt from "jsonwebtoken";
import { serverConfig } from "./config";

export interface JwtPayload {
  /** username (access/refresh) or player name (ws) */
  userName: string;
  /** user id (access/refresh) or room name (ws) */
  sub: string;
}

type ExpiresIn = jwt.SignOptions["expiresIn"];

function sign(payload: JwtPayload, secret: string, expiresIn: string): string {
  if (!secret) {
    throw new Error("JWT secret is not configured");
  }
  return jwt.sign(payload, secret, {
    expiresIn: expiresIn as unknown as ExpiresIn,
  });
}

function verify(token: string, secret: string): JwtPayload | null {
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    return null;
  }
}

export function signAccessToken(payload: JwtPayload): string {
  return sign(
    payload,
    serverConfig.jwtTokenSecret(),
    serverConfig.jwtTokenExpiration(),
  );
}

export function verifyAccessToken(token: string): JwtPayload | null {
  return verify(token, serverConfig.jwtTokenSecret());
}

export function signRefreshToken(payload: JwtPayload): string {
  return sign(
    payload,
    serverConfig.jwtRefreshSecret(),
    serverConfig.jwtRefreshExpiration(),
  );
}

export function verifyRefreshToken(token: string): JwtPayload | null {
  return verify(token, serverConfig.jwtRefreshSecret());
}

export function signWsToken(playerName: string, roomName: string): string {
  return sign(
    { userName: playerName, sub: roomName },
    serverConfig.jwtWsSecret(),
    serverConfig.jwtWsExpiration(),
  );
}

export function verifyWsToken(token: string): JwtPayload | null {
  return verify(token, serverConfig.jwtWsSecret());
}
