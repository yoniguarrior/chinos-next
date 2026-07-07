import { randomUUID } from "node:crypto";
import { RefreshTokenModel } from "@/models/refresh-token";
import { ForgotPasswordModel } from "@/models/forgot-password";
import { serverConfig } from "./config";
import { apiError } from "./errors";
import { comparePassword } from "./crypto";
import { getIp, getBrowserInfo } from "./request";
import { signAccessToken, signRefreshToken, verifyAccessToken } from "./jwt";
import { getUserById, getUserByUserName, getUserByEmail } from "./users";
import { sendEmailForgot } from "./mailer";

export interface AuthUser {
  id: string;
  userName: string;
}

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 3600 * 1000);
}

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/* ------------------------------------------------------------------ *
 * Guards
 * ------------------------------------------------------------------ */

export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

/** Mirrors JwtAuthGuard + JwtStrategy: returns { id, userName } from the token. */
export function requireUser(req: Request): AuthUser {
  const token = getBearerToken(req);
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload) throw apiError(401, "unauthorized");
  return { id: payload.sub, userName: payload.userName };
}

/** Mirrors JwtAuthGuard + RolesGuard(Role.Admin). */
export async function requireAdmin(req: Request) {
  const authUser = requireUser(req);
  const user = await getUserById(authUser.id);
  if (!user || !user.roles?.includes("admin")) {
    throw apiError(403, "forbidden");
  }
  return user;
}

/* ------------------------------------------------------------------ *
 * Tokens
 * ------------------------------------------------------------------ */

export function createAccessToken(user: AuthUser): string {
  return signAccessToken({ userName: user.userName, sub: user.id });
}

export async function createRefreshTokenRecord(
  req: Request,
  user: AuthUser,
): Promise<string> {
  const token = signRefreshToken({ userName: user.userName, sub: user.id });

  const existing = await RefreshTokenModel.findOne({
    userId: user.id,
  }).setOptions({ sanitizeFilter: true });
  if (existing) await removeRefreshToken(user.id);

  // refreshToken is hashed by the model's pre-save hook.
  await new RefreshTokenModel({
    userId: user.id,
    refreshToken: token,
    ipRequest: getIp(req),
    browserRequest: getBrowserInfo(req),
  }).save();

  return token;
}

export async function removeRefreshToken(userId: string) {
  return RefreshTokenModel.deleteOne({ userId }).setOptions({
    sanitizeFilter: true,
  });
}

export async function getUserIfRefreshTokenValidates(
  req: Request,
  rawToken: string,
  userId: string,
) {
  const saved = await RefreshTokenModel.findOne({ userId }).setOptions({
    sanitizeFilter: true,
  });
  if (!saved) throw apiError(400, "no_reftk");

  const matches = await comparePassword(rawToken, saved.refreshToken);

  if (
    matches &&
    getIp(req) === saved.ipRequest &&
    getBrowserInfo(req) === saved.browserRequest
  ) {
    return getUserById(userId);
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Password / login
 * ------------------------------------------------------------------ */

export async function checkUserPassword(userName: string, attemptPass: string) {
  const user = await getUserByUserName(userName);
  if (!user) throw apiError(400, "user_fail");

  if (user.blockExpires > new Date()) throw apiError(409, "user_blocked");

  const match = await comparePassword(attemptPass, user.password);
  if (!match) {
    user.loginAttempts += 1;
    await user.save();

    if (
      user.loginAttempts >= parseInt(serverConfig.loginAttemptsToBlock(), 10)
    ) {
      user.blockExpires = hoursFromNow(
        parseInt(serverConfig.hoursToBlock(), 10),
      );
      await user.save();
      throw apiError(409, "user_blocked");
    }
    throw apiError(400, "pass_fail");
  }

  user.loginAttempts = 0;
  await user.save();
  return user;
}

/* ------------------------------------------------------------------ *
 * Forgot / reset password
 * ------------------------------------------------------------------ */

export async function doForgotPassword(req: Request, email: string) {
  const user = await getUserByEmail(email);

  if (user) {
    const verification = randomUUID();
    await ForgotPasswordModel.create({
      email,
      verification,
      expires: minutesFromNow(
        parseInt(serverConfig.minutesToVerifyReset(), 10),
      ),
      ipRequest: getIp(req),
      browserRequest: getBrowserInfo(req),
    });
    const res = await sendEmailForgot(user.userName, email, verification);
    return { email, message: "Forgot Pass. - " + res };
  }

  return { email, message: "email not found or not verified" };
}

export async function doForgotPasswordVerify(req: Request, uuid: string) {
  const forgot = await ForgotPasswordModel.findOne({
    verification: uuid,
    firstUsed: false,
    finalUsed: false,
    expires: { $gt: new Date() },
  });
  if (!forgot) throw apiError(400, "not_valid");

  forgot.firstUsed = true;
  forgot.ipChanged = getIp(req);
  forgot.browserChanged = getBrowserInfo(req);
  await forgot.save();

  return { email: forgot.email, message: "now reset your password." };
}

export async function doResetPassword(
  req: Request,
  uuid: string,
  password: string,
) {
  const forgot = await ForgotPasswordModel.findOne({
    verification: uuid,
    firstUsed: true,
    finalUsed: false,
    expires: { $gt: new Date() },
  });
  if (!forgot) throw apiError(400, "not_valid");

  forgot.finalUsed = true;
  await forgot.save();

  const user = await getUserByEmail(forgot.email);
  if (!user) throw apiError(400, "email_not_found");

  user.password = password; // hashed by the model's pre-save hook
  await user.save();

  return { email: forgot.email, message: "password successfully changed." };
}
