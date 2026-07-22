"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { ChevronDown, Maximize2, MessageCircle, Send } from "lucide-react"
import { useRoomStore } from "@/stores/room"
import type { IUserAction } from "@/types/game"

const pad = (n: number) => String(n).padStart(2, "0")
const PLAYER_COLOR_VARIANTS = 5

function playerColorClass(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return `player-color-${(hash % PLAYER_COLOR_VARIANTS) + 1}`
}

function formatTime(timeSent: Date | string): string {
  const date = new Date(timeSent)
  const now = new Date()
  const dayPart =
    now.getDate() !== date.getDate() ? `${pad(date.getDate())} ` : ""
  return `${dayPart}${pad(date.getHours())}:${pad(date.getMinutes())}`
}

type ChatState = "idle" | "preview" | "expanded"

export function ChatBox({
  onUserAction,
}: {
  onUserAction: (action: IUserAction) => void
}) {
  const t = useTranslations()
  const playerName = useRoomStore((s) => s.playerName)
  const rawMessages = useRoomStore((s) => s.roomData.messages)

  const [text, setText] = useState("")
  const [chatState, setChatState] = useState<ChatState>("idle")
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const messages = useMemo(
    () =>
      (rawMessages ?? []).map((m) => ({
        fromUser: m.fromUser,
        text: m.text,
        timeSent: formatTime(m.timeSent),
      })),
    [rawMessages],
  )

  const lastMsg = messages.at(-1)

  // Transition to preview when first message arrives while idle
  useEffect(() => {
    if (messages.length > 0 && chatState === "idle") {
      setChatState("preview")
    }
  }, [messages.length, chatState])

  // Scroll to bottom when expanded
  useEffect(() => {
    if (chatState === "expanded") {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
  }, [messages.length, chatState])

  // Focus input when panel opens
  useEffect(() => {
    if (chatState === "expanded") {
      inputRef.current?.focus()
    }
  }, [chatState])

  const open = () => setChatState("expanded")

  const collapse = () => setChatState(messages.length > 0 ? "preview" : "idle")

  const send = () => {
    const trimmed = text.trim()
    if (trimmed) {
      onUserAction({ action: "message-sent", value: trimmed })
      setText("")
    }
  }

  // ── Idle: floating icon button ────────────────────────────────────────────
  if (chatState === "idle") {
    return (
      <div className="chat-fab-container">
        <button
          type="button"
          className="chat-fab"
          aria-label="Abrir chat"
          onClick={open}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      </div>
    )
  }

  // ── Preview: thin bottom bar with last message (design 2a) ────────────────
  if (chatState === "preview") {
    return (
      <div className="chat-fab-container">
        <button
          type="button"
          className="chat-preview w-full max-w-240 mx-auto"
          aria-label="Expandir chat"
          onClick={open}
        >
          <span className="chat-preview-label">Chat</span>
          {lastMsg && (
            <span className="chat-preview-text">
              {lastMsg.fromUser === playerName ? (
                <span className="chat-preview-author own">{t("You")}:</span>
              ) : (
                <span
                  className={`chat-preview-author ${playerColorClass(lastMsg.fromUser)}`}
                >
                  {lastMsg.fromUser}:
                </span>
              )}{" "}
              {lastMsg.text}
            </span>
          )}
          <Maximize2 className="chat-preview-expand" aria-hidden />
        </button>
      </div>
    )
  }

  // ── Expanded: full panel sliding up from bottom ───────────────────────────
  return (
    <>
      <div className="chat-backdrop" onClick={collapse} aria-hidden="true" />
      <div id="chatbox" className="chat-panel">
        <div className="chat-panel-header w-full max-w-240 mx-auto">
          <span className="chat-panel-title">Chat</span>
          <button
            type="button"
            className="chat-panel-close"
            aria-label="Cerrar chat"
            onClick={collapse}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <div ref={scrollRef} className="chat-panel-messages w-full max-w-240 mx-auto">
          {messages.map((msg, ix) => (
            <div key={`${ix}-${msg.timeSent}`} className="chat-line">
              {msg.fromUser === playerName ? (
                <span className="message-from own">{t("You")}: </span>
              ) : (
                <span
                  className={`message-from other ${playerColorClass(msg.fromUser)}`}
                >
                  {msg.fromUser}:{" "}
                </span>
              )}
              <span className="message-text">{msg.text}</span>
            </div>
          ))}
        </div>

        <div className="chat-panel-footer w-full max-w-240 mx-auto">
          <input
            ref={inputRef}
            type="text"
            className="chat-panel-input"
            placeholder={t("write_msg")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyUp={(e) => {
              if (e.key === "Enter") send()
            }}
          />
          <button
            type="button"
            className="chat-panel-send"
            onClick={send}
            aria-label="Enviar"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  )
}
