export interface User {
  userId: string;
  userName: string;
  accessToken: string;
}

export interface LoginPayload {
  userName: string;
  password: string;
  [key: string]: unknown;
}
