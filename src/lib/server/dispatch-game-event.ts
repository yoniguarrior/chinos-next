import type { IWsData, WsResult } from "./game";
import {
  annotateBet,
  annotateCoins,
  annotateMsg,
  closeHand,
  closeRound,
  gameAbandon,
  gameStop,
  getSyncData,
  newRound,
  processStart,
  selectNext,
  showCoins,
  WsError,
} from "./game";

export interface DispatchResult {
  self?: WsResult;
  broadcast?: WsResult;
  others?: WsResult;
}

export async function dispatchGameEvent(
  event: string,
  payload: Record<string, unknown>,
  wsData: IWsData,
  socketId: string,
): Promise<DispatchResult> {
  switch (event) {
    case "sync": {
      const result = await getSyncData(wsData, socketId);
      return {
        self: result,
        others: {
          event: "userSync",
          data: (result.data as { roomData: unknown }).roomData,
        },
      };
    }
    case "gameStart": {
      const result = await processStart(wsData);
      return { broadcast: result };
    }
    case "coinsTaken": {
      const result = await annotateCoins(Number(payload.coins), wsData);
      return { broadcast: result };
    }
    case "betSetted": {
      const result = await annotateBet(Number(payload.bet), wsData);
      return { broadcast: result };
    }
    case "showCoins": {
      const result = await showCoins(wsData);
      return { broadcast: result };
    }
    case "closeHand": {
      const result = await closeHand(wsData);
      return { broadcast: result };
    }
    case "closeRound": {
      const result = await closeRound(wsData);
      return { broadcast: result };
    }
    case "selectNext": {
      const result = await selectNext(wsData);
      return { broadcast: result };
    }
    case "newRound": {
      const result = await newRound(String(payload.playerStart), wsData);
      return { broadcast: result };
    }
    case "gameStop": {
      const result = await gameStop(wsData);
      return { broadcast: result };
    }
    case "gameAbandon": {
      const result = await gameAbandon(wsData);
      return { broadcast: result };
    }
    case "messageSent": {
      const result = await annotateMsg(String(payload.text), wsData);
      return { broadcast: result };
    }
    case "exitRoom":
      return {};
    default:
      throw new WsError("unknown_event");
  }
}
