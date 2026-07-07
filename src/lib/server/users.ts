import { randomUUID } from "node:crypto";
import type { HydratedDocument } from "mongoose";
import { UserModel, type User, type Role } from "@/models/user";
import { serverConfig } from "./config";
import { apiError } from "./errors";
import { sendEmailVerify } from "./mailer";

export type UserDoc = HydratedDocument<User>;

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 3600 * 1000);
}

function setRegistrationInfo(user: UserDoc): void {
  user.emailVerifyKey = randomUUID();
  user.emailVerifyExpires = hoursFromNow(
    parseInt(serverConfig.hoursToVerifyEmail(), 10),
  );
}

export function getUserById(userId: string) {
  return UserModel.findById(userId);
}

export function getUserByUserName(userName: string) {
  return UserModel.findOne({ userName }).setOptions({ sanitizeFilter: true });
}

export function getUserByEmail(email: string) {
  return UserModel.findOne({ email }).setOptions({ sanitizeFilter: true });
}

export async function getAllUsers() {
  return UserModel.find().select("-password");
}

export async function getAllUserNames(): Promise<string[]> {
  const users = await UserModel.find().select("userName -_id");
  return users.map((u) => u.userName);
}

export async function checkUserNameExists(userName: string): Promise<boolean> {
  const userNames = await getAllUserNames();
  return userNames.includes(userName);
}

async function isEmailUnique(email: string): Promise<void> {
  const user = await UserModel.findOne({ email, emailVerified: true }).setOptions(
    { sanitizeFilter: true },
  );
  if (user) throw apiError(400, "unique_email");
}

async function isUsernameUnique(userName: string): Promise<void> {
  const user = await UserModel.findOne({ userName }).setOptions({
    sanitizeFilter: true,
  });
  if (user) throw apiError(400, "unique_username");
}

export interface CreateUserInput {
  userName: string;
  email?: string;
  password: string;
  roles?: Role[];
}

export async function createUserAccount(input: CreateUserInput) {
  if (input.email) await isEmailUnique(input.email);
  await isUsernameUnique(input.userName);

  const user = new UserModel(input) as UserDoc;
  setRegistrationInfo(user);

  await user.save();

  if (user.email) {
    void sendEmailVerify(user.userName, user.email, user.emailVerifyKey);
  }

  return {
    userName: user.userName,
    email: user.email,
    roles: user.roles,
  };
}

export async function verifyUserEmail(uuid: string) {
  const user = await UserModel.findOne({
    emailVerifyKey: uuid,
    emailVerified: false,
    emailVerifyExpires: { $gt: new Date() },
  });
  if (!user) throw apiError(400, "not_valid");

  user.emailVerified = true;
  await user.save();

  return { userName: user.userName, email: user.email };
}

export interface UpdateUserInput {
  email?: string;
  roles?: Role[];
}

export async function updateUserById(
  userId: string,
  input: UpdateUserInput,
  sendVerifyEmail = false,
): Promise<boolean> {
  const user = await UserModel.findById(userId);
  if (!user) throw apiError(404, "no_user");

  let extra: Record<string, unknown> = {};
  const mustSendEmail =
    sendVerifyEmail &&
    input.email !== undefined &&
    input.email !== "" &&
    user.email !== input.email;

  if (mustSendEmail) {
    setRegistrationInfo(user);
    extra = {
      email: input.email,
      emailVerified: false,
      emailVerifyKey: user.emailVerifyKey,
      emailVerifyExpires: user.emailVerifyExpires,
    };
  }

  const updateData = { ...extra, ...input };
  const res = await UserModel.updateOne({ _id: userId }, updateData);

  if (res.matchedCount === 0) throw apiError(404, "no_user");

  if (res.modifiedCount === 1) {
    if (mustSendEmail && input.email) {
      void sendEmailVerify(user.userName, input.email, user.emailVerifyKey);
    }
    return true;
  }

  return false;
}

export async function deleteUserById(userId: string): Promise<boolean> {
  const res = await UserModel.deleteOne({ _id: userId }).setOptions({
    sanitizeFilter: true,
  });
  if (res.deletedCount === 0) throw apiError(404, "no_user");
  return res.acknowledged;
}

export async function changeUserPassword(
  userName: string,
  newPassword: string,
): Promise<boolean> {
  const res = await UserModel.updateOne({ userName }, { password: newPassword });
  if (res.matchedCount === 0) throw apiError(404, "no_user");
  return res.modifiedCount === 1;
}

export async function updateVerifyKey(userId: string): Promise<UserDoc> {
  const user = await UserModel.findById(userId);
  if (!user) throw apiError(404, "no_user");

  setRegistrationInfo(user);
  await user.save();

  return user;
}
