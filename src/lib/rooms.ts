import { createApi } from "./api";
import { setLocalState } from "./local-state";
import { useAuthStore } from "@/stores/auth";
import { useErrorStore } from "@/stores/error";
import type { IRoom } from "@/types/room";
import type { UpdateRoomType } from "./schemas";

/**
 * Room API actions (port of the Nuxt `useRoom` composable). Validation
 * happens in the forms; these functions just call the API and record
 * errors / local room state.
 */

const errorStore = () => useErrorStore.getState();
const authStore = () => useAuthStore.getState();

export async function listPublics(): Promise<IRoom[]> {
  const { get } = createApi("/rooms/public");
  try {
    const res = await get<{ data: IRoom[] }>();
    errorStore().reset();
    return res.data ?? [];
  } catch (e) {
    errorStore().setError(e);
    return [];
  }
}

export async function listPrivates(): Promise<IRoom[]> {
  const accessToken = (await authStore().getUser()).accessToken;
  const { get } = createApi("/rooms/myrooms", accessToken);
  try {
    const res = await get<{ data: IRoom[] }>();
    errorStore().reset();
    return res.data ?? [];
  } catch (e) {
    errorStore().setError(e);
    return [];
  }
}

export async function createPublicRoom(
  roomName: string,
  playerName: string,
): Promise<void> {
  const { post } = createApi("/rooms");
  try {
    await post({ roomName, playerName });
    errorStore().reset();
  } catch (e) {
    errorStore().setError(e);
  }
}

export async function createPrivateRoom(
  roomName: string,
  password: string,
): Promise<void> {
  const accessToken = (await authStore().getUser()).accessToken;
  const { post } = createApi("/rooms/private", accessToken);
  try {
    await post({ roomName, password });
    errorStore().reset();
  } catch (e) {
    errorStore().setError(e);
  }
}

export async function getRoomData(roomName: string): Promise<IRoom> {
  const accessToken = (await authStore().getUser()).accessToken;
  const { get } = createApi(`/rooms/${roomName}`, accessToken);
  try {
    const res = await get<{ data: IRoom }>();
    errorStore().reset();
    return res.data;
  } catch (e) {
    errorStore().setError(e);
    return {} as IRoom;
  }
}

export async function updateRoomData(
  newRoomData: UpdateRoomType,
): Promise<void> {
  const accessToken = authStore().user.accessToken;
  const { patch } = createApi(`/rooms/${newRoomData.roomName}`, accessToken);
  try {
    await patch(newRoomData);
    errorStore().reset();
  } catch (e) {
    errorStore().setError(e);
  }
}

export async function addUserToRoom(
  roomName: string,
  userName: string,
): Promise<void> {
  const accessToken = (await authStore().getUser()).accessToken;
  const { patch } = createApi(`/rooms/adduser/${roomName}`, accessToken);
  try {
    await patch({ userName });
    errorStore().reset();
  } catch (e) {
    errorStore().setError(e);
  }
}

export async function removeUserFromRoom(
  roomName: string,
  userName: string,
): Promise<void> {
  const accessToken = (await authStore().getUser()).accessToken;
  const { patch } = createApi(`/rooms/removeuser/${roomName}`, accessToken);
  try {
    await patch({ userName });
    errorStore().reset();
  } catch (e) {
    errorStore().setError(e);
  }
}

export async function removeRoom(roomName: string): Promise<void> {
  const accessToken = (await authStore().getUser()).accessToken;
  const { del } = createApi(`/rooms/${roomName}`, accessToken);
  try {
    await del();
    errorStore().reset();
  } catch (e) {
    errorStore().setError(e);
  }
}

export async function joinPrivateRoom(roomName: string): Promise<void> {
  const accessToken = (await authStore().getUser()).accessToken;
  const { post } = createApi(`/rooms/private/${roomName}`, accessToken);
  try {
    await post();
    setLocalState({ room: roomName });
    errorStore().reset();
  } catch (e) {
    setLocalState({ room: "" });
    errorStore().setError(e);
  }
}

export async function joinRoomAsGuest(
  roomName: string,
  playerName: string,
  password: string,
): Promise<void> {
  const { post } = createApi("/rooms/guest");
  try {
    await post({ roomName, password, playerName });
    setLocalState({ room: roomName });
    errorStore().reset();
  } catch (e) {
    setLocalState({ room: "" });
    errorStore().setError(e);
  }
}

export async function joinPublicRoom(
  roomName: string,
  playerName: string,
): Promise<void> {
  const { post } = createApi(`/rooms/${roomName}`);
  try {
    await post({ playerName });
    setLocalState({ room: roomName });
    errorStore().reset();
  } catch (e) {
    setLocalState({ room: "" });
    errorStore().setError(e);
  }
}

export async function leaveRoom(): Promise<void> {
  const { post } = createApi("/rooms/leave");
  try {
    await post();
    setLocalState({ room: "" });
    errorStore().reset();
  } catch (e) {
    errorStore().setError(e);
    if (useErrorStore.getState().details !== "game_in_play") {
      setLocalState({ room: "" });
    }
  }
}

export async function checkUser(playerName: string): Promise<boolean> {
  const { post } = createApi("/rooms/checkuser");
  try {
    const res = await post<{ data: boolean }>({ playerName });
    errorStore().reset();
    return res.data;
  } catch (e) {
    errorStore().setError(e);
    return false;
  }
}

export async function checkPlayer(
  roomName: string,
  playerName: string,
): Promise<boolean> {
  const { post } = createApi("/rooms/checkplayer");
  try {
    const res = await post<{ data: boolean }>({ roomName, playerName });
    errorStore().reset();
    return res.data;
  } catch (e) {
    errorStore().setError(e);
    return false;
  }
}
