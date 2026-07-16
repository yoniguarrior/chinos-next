"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, MessageCircle, Send } from "lucide-react";
import { useRoomStore } from "@/stores/room";
import type { IUserAction } from "@/types/game";

const pad = (n: number) => String(n).padStart(2, "0");

function formatTime(timeSent: Date | string): string {
  const date = new Date(timeSent);
  const now = new Date();
  const dayPart = now.getDate() !== date.getDate() ? `${pad(date.getDate())} ` : "";
  return `${dayPart}${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type ChatState = "idle" | "preview" | "expanded";

export function ChatBox({
  onUserAction,
}: {
  onUserAction: (action: IUserAction) => void;
}) {
  const t = useTranslations();
  const playerName = useRoomStore((s) => s.playerName);
  const rawMessages = useRoomStore((s) => s.roomData.messages);

  const [text, setText] = useState("");
  const [chatState, setChatState] = useState<ChatState>("idle");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const messages = useMemo(
    () =>
      (rawMessages ?? []).map((m) => ({
        fromUser: m.fromUser,
        text: m.text,
        timeSent: formatTime(m.timeSent),
      })),
    [rawMessages],
  );

  const lastMsg = messages.at(-1);

  // Transition to preview when first message arrives while idle
  useEffect(() => {
    if (messages.length > 0 && chatState === "idle") {
      setChatState("preview");
    }
  }, [messages.length, chatState]);

  // Scroll to bottom when expanded
  useEffect(() => {
    if (chatState === "expanded") {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, chatState]);

  // Focus input when panel opens
  useEffect(() => {
    if (chatState === "expanded") {
      inputRef.current?.focus();
    }
  }, [chatState]);

  const open = () => setChatState("expanded");

  const collapse = () => setChatState(messages.length > 0 ? "preview" : "idle");

  const send = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onUserAction({ action: "message-sent", value: trimmed });
      setText("");
    }
  };

  // ── Idle: floating icon button ────────────────────────────────────────────
  if (chatState === "idle") {
    return (
      <button
        type="button"
        className="chat-fab"
        aria-label="Abrir chat"
        onClick={open}
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  // ── Preview: thin bottom bar with last message ────────────────────────────
  if (chatState === "preview") {
    return (
      <button
        type="button"
        className="chat-preview"
        aria-label="Expandir chat"
        onClick={open}
      >
        <span className="chat-preview-label">Chat</span>
        {lastMsg && (
          <span className="chat-preview-text">
            <span
              className={
                lastMsg.fromUser === playerName ? "text-ch-accent" : "text-ch-win"
              }
            >
              {lastMsg.fromUser === playerName ? t("You") : lastMsg.fromUser}
            </span>
            {": "}
            {lastMsg.text}
          </span>
        )}
        <ChevronUp className="chat-preview-chevron" aria-hidden />
      </button>
    );
  }

  // ── Expanded: full panel sliding up from bottom ───────────────────────────
  return (
    <>
      <div className="chat-backdrop" onClick={collapse} aria-hidden="true" />
      <div id="chatbox" className="chat-panel">
        <div className="chat-panel-header">
          <span className="chat-panel-title">Chat</span>
          <button
            type="button"
            className="chat-panel-close"
            aria-label="Cerrar chat"
            onClick={collapse}
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        <div ref={scrollRef} className="chat-panel-messages">
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

        <div className="chat-panel-footer">
          <input
            ref={inputRef}
            type="text"
            className="chat-panel-input"
            placeholder={t("write_msg")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyUp={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button
            type="button"
            className="chat-panel-send"
            onClick={send}
            aria-label="Enviar"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  );
}
