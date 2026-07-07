"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { useRoomStore } from "@/stores/room";
import type { IUserAction } from "@/types/game";

const pad = (n: number) => String(n).padStart(2, "0");

/** Formats a message timestamp as "[dd ]HH:MM" (day only when not today). */
function formatTime(timeSent: Date | string): string {
  const date = new Date(timeSent);
  const now = new Date();
  const dayPart = now.getDate() !== date.getDate() ? `${pad(date.getDate())} ` : "";
  return `${dayPart}${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ChatBox({
  onUserAction,
}: {
  onUserAction: (action: IUserAction) => void;
}) {
  const t = useTranslations();
  const playerName = useRoomStore((s) => s.playerName);
  const rawMessages = useRoomStore((s) => s.roomData.messages);

  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const messages = useMemo(
    () =>
      (rawMessages ?? []).map((m) => ({
        fromUser: m.fromUser,
        text: m.text,
        timeSent: formatTime(m.timeSent),
      })),
    [rawMessages],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = () => {
    if (text !== "") {
      onUserAction({ action: "message-sent", value: text });
      setText("");
    }
  };

  return (
    <div id="chatbox" className="chat-box card">
      <div className="msg-box-header rounded-t-lg bg-gray-500">
        <h5>&nbsp;Chat&nbsp;</h5>
      </div>
      <div id="chatboxscroll" ref={scrollRef} className="card-body p-1!">
        {messages.map((msg, ix) => (
          <div
            key={`${ix}-${msg.timeSent}`}
            className={`chat-msg ${msg.fromUser === playerName ? "justify-end!" : ""}`}
          >
            <div className="message-time">&nbsp;[{msg.timeSent}]&nbsp;</div>
            {msg.fromUser === playerName ? (
              <div className="message-from own">{t("You")}:</div>
            ) : (
              <div className="message-from other">{msg.fromUser}:</div>
            )}
            <div className="message-text">{msg.text}</div>
          </div>
        ))}
      </div>
      <div className="input-group flex rounded border-1 border-gray-300 p-0!">
        <input
          id="message-input"
          type="text"
          className="form-control"
          placeholder={t("write_msg")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyUp={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button
          id="send-button"
          className="btn btn-custom"
          type="button"
          onClick={send}
        >
          <Send className="inline h-[27px] w-[27px]" />
        </button>
      </div>
    </div>
  );
}
