import type { Role } from "./enums";

export interface IURoom {
  roomName: string;
  owner: string;
  users: string[];
  status: string;
  gameStatus: string;
  numPlayers: number;
}

export interface IUser {
  userId: string;
  userName: string;
  email: string;
  roles: Role[];
  rooms: IURoom[];
  emailVerified: boolean;
}

export interface RegisterPayload {
  userName: string;
  email?: string;
  password: string;
  [key: string]: unknown;
}

export interface UpdateUserPayload {
  email?: string;
  roles?: Role[];
  [key: string]: unknown;
}

export interface ChangePassPayload {
  oldPassword: string;
  newPassword: string;
  [key: string]: unknown;
}

export interface ForgotPassPayload {
  email: string;
}
