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
  // Messages with a timeout close themselves and reveal the input UI.
  useEffect(() => {
    if (gameMsg.timeOut == null) return;
    const timer = setTimeout(() => {
      onShowInput();
      onCloseModal();
    }, gameMsg.timeOut);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMsg.timeOut]);

  return (
    <div id="game-msg" className={`game-msg card z-1000 my-0 ${gameMsg.type}`}>
      <div className="msg-text">{gameMsg.text}</div>
      {gameMsg.buttons && (
        <div className="btns-group flex justify-end">
          {gameMsg.buttons.map((btn) => (
            <button
              key={btn.event}
              className="btn btn-answer my-0 min-w-0 first:ml-0 last:mr-0"
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
