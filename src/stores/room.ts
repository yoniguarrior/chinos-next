import { create } from "zustand";
import type { Game, IXRoom } from "@/types/room";
import { GameStatus } from "@/types/enums";

/**
 * Room store (port of the Pinia room store): data of the room the player is
 * connected to and of the active game.
 */

interface RoomState {
  playerName: string;
  roomData: IXRoom;
  ownCoins: number | null;
  isJoined: boolean;
  setJoined: (room: string, player: string) => void;
  setRoomData: (data: IXRoom) => void;
  setPlayerName: (name: string) => void;
  setOwnCoins: (coins: number | null) => void;
  reset: () => void;
}

const EMPTY_ROOM: IXRoom = { roomName: "", game: {} as Game };

export const useRoomStore = create<RoomState>((set) => ({
  playerName: "",
  roomData: { ...EMPTY_ROOM },
  ownCoins: null,
  isJoined: false,

  setJoined: (room, player) =>
    set((state) => ({
      roomData: { ...state.roomData, roomName: room },
      playerName: player,
      isJoined: room !== "",
    })),

  setRoomData: (data) => set({ roomData: data }),

  setPlayerName: (name) => set({ playerName: name }),

  setOwnCoins: (coins) => set({ ownCoins: coins }),

  reset: () =>
    set({
      playerName: "",
      roomData: { roomName: "", game: {} as Game },
      isJoined: false,
    }),
}));

/* Derived selectors (getters of the Pinia store) */

export function selectIsReady(state: RoomState): boolean {
  return state.roomData.roomName !== "";
}

export function selectNumPlayers(state: RoomState): number {
  return state.roomData.game.players ? state.roomData.game.players.length : 0;
}

export function selectConnectedPlayers(state: RoomState): number {
  return state.roomData.game.players
    ? state.roomData.game.players.filter((p) => p.online).length
    : 0;
}

export function selectGameInPlay(state: RoomState): boolean {
  return (
    !!state.roomData.game.status &&
    state.roomData.game.status !== GameStatus.WaitingStart
  );
}
