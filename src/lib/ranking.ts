import { createApi } from "./api";
import { useAuthStore } from "@/stores/auth";
import { useErrorStore } from "@/stores/error";
import type { IRanking, IURanking } from "@/types/ranking";

/** Ranking API actions (port of the Nuxt `useRanking` module). */

export async function getRanking(): Promise<IRanking | undefined> {
  const { get } = createApi("/ranking");
  try {
    const res = await get<{ data: IRanking }>();
    useErrorStore.getState().reset();
    return res.data;
  } catch (e) {
    useErrorStore.getState().setError(e);
    return undefined;
  }
}

export async function getUserRanking(): Promise<IURanking | undefined> {
  const accessToken = (await useAuthStore.getState().getUser()).accessToken;
  const { get } = createApi("/ranking/user", accessToken);
  try {
    const res = await get<{ data: IURanking }>();
    useErrorStore.getState().reset();
    return res.data;
  } catch (e) {
    useErrorStore.getState().setError(e);
    return undefined;
  }
}
