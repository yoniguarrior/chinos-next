import { createApi } from "./api";
import { useAuthStore } from "@/stores/auth";
import { useErrorStore } from "@/stores/error";
import type {
  ChangePassPayload,
  ForgotPassPayload,
  IUser,
  RegisterPayload,
  UpdateUserPayload,
} from "@/types/user";
import type { Role } from "@/types/enums";

/**
 * User API actions (port of the Nuxt `useUser` module). Plain async
 * functions, callable from event handlers; errors land in the error store.
 */

interface ResetPassPayload {
  uuid: string;
  password: string;
  confirmPassword: string;
  [key: string]: unknown;
}

const errorStore = () => useErrorStore.getState();
const authStore = () => useAuthStore.getState();

export async function register(payload: RegisterPayload): Promise<void> {
  const { post } = createApi("/users/register");
  try {
    await post(payload);
    errorStore().reset();
  } catch (e) {
    errorStore().setError(e);
  }
}

export async function verifyEmail(uuid: string): Promise<void> {
  const { get } = createApi(`/users/verify-email/${uuid}`);
  try {
    await get();
    errorStore().reset();
  } catch (e) {
    errorStore().setError(e);
  }
}

export async function resendVerifyEmail(): Promise<void> {
  const accessToken = (await authStore().getUser()).accessToken;
  const { get } = createApi("/email/resend-verify", accessToken);
  try {
    await get();
    errorStore().reset();
  } catch (e) {
    errorStore().setError(e);
  }
}

export async function profile(): Promise<IUser | undefined> {
  const accessToken = (await authStore().getUser()).accessToken;
  const { get } = createApi("/users/profile", accessToken);
  try {
    const res = await get<{ data: IUser }>();
    errorStore().reset();
    return res.data;
  } catch (e) {
    errorStore().setError(e);
    return undefined;
  }
}

export async function listUsers(): Promise<string[] | undefined> {
  const accessToken = (await authStore().getUser()).accessToken;
  const { get } = createApi("/users/list", accessToken);
  try {
    const res = await get<{ data: string[] }>();
    errorStore().reset();
    return res.data;
  } catch (e) {
    errorStore().setError(e);
    return undefined;
  }
}

export async function checkUserName(userName: string): Promise<boolean> {
  const accessToken = (await authStore().getUser()).accessToken;
  const { get } = createApi(
    `/users/checkname?userName=${encodeURIComponent(userName)}`,
    accessToken,
  );
  try {
    const res = await get<{ data: boolean }>();
    errorStore().reset();
    return res.data ?? false;
  } catch (e) {
    errorStore().setError(e);
    return false;
  }
}

export async function updateUser(email: string, roles?: Role[]): Promise<void> {
  const accessToken = (await authStore().getUser()).accessToken;
  const { patch } = createApi("/users/update", accessToken);
  const payload: UpdateUserPayload = { email, roles };
  try {
    await patch(payload);
    errorStore().reset();
  } catch (e) {
    errorStore().setError(e);
  }
}

export async function changePassword(
  payload: ChangePassPayload,
): Promise<void> {
  const accessToken = (await authStore().getUser()).accessToken;
  const { patch } = createApi("/users/changepass", accessToken);
  try {
    await patch(payload);
    errorStore().reset();
  } catch (e) {
    errorStore().setError(e);
  }
}

export async function forgotPassword(
  payload: ForgotPassPayload,
): Promise<void> {
  const { post } = createApi("/users/forgot-password");
  try {
    await post({ ...payload });
    errorStore().reset();
  } catch (e) {
    errorStore().setError(e);
  }
}

export async function verifyForgotPass(uuid: string): Promise<void> {
  const { get } = createApi(`/users/verify-forgot-pass/${uuid}`);
  try {
    await get();
    errorStore().reset();
  } catch (e) {
    errorStore().setError(e);
  }
}

export async function resetPassword(payload: ResetPassPayload): Promise<void> {
  const { post } = createApi("/users/reset-password");
  try {
    await post(payload);
    errorStore().reset();
  } catch (e) {
    errorStore().setError(e);
  }
}
