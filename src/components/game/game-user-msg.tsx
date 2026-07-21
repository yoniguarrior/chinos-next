"use client";

import { useEffect } from "react";
import type { IGameMsg, IUserAction } from "@/types/game";

interface GameUserMsgProps {
  gameMsg: IGameMsg;
  onCloseModal: () => void;
  onShowInput: () => void;
  onSetData: (data: IUserAction) => void;
}

export function GameUserMsg({
  gameMsg,
  onCloseModal,
  onShowInput,
  onSetData,
}: GameUserMsgProps) {
  // Timed messages keep the turn panel visible and reveal the input under it
  // (design 2a: instruction + bet row together).
  useEffect(() => {
    if (gameMsg.timeOut == null) return;
    const timer = setTimeout(() => {
      onShowInput();
    }, gameMsg.timeOut);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMsg.timeOut]);

  return (
    <div className="flex flex-col gap-3">
      <div id="game-msg" className={`game-msg turn-panel ${gameMsg.type}`}>
        <div className="msg-text">{gameMsg.text}</div>
        {gameMsg.detail && <div className="msg-detail">{gameMsg.detail}</div>}
      </div>
      {gameMsg.buttons && (
        <div className="btns-group flex justify-center">
          {gameMsg.buttons.map((btn) => (
            <button
              key={btn.event}
              className="pill-cta"
              type="button"
              onClick={() => onSetData({ action: btn.event, value: "" })}
            >
              {btn.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
