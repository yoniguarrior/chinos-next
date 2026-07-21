import type { MessageType } from "./enums";

export interface IBtnMsg {
  text: string;
  event: string;
}

export interface IGameMsg {
  text: string;
  detail?: string;
  type: MessageType;
  timeOut: number | null;
  buttons: IBtnMsg[] | null;
}

export interface IUserInput {
  action: string;
  list: string[];
  timeOut: number | undefined;
}

export interface IUserAction {
  action: string;
  value: string;
}
