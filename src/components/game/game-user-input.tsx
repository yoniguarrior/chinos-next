"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import type { IUserAction, IUserInput } from "@/types/game";

interface GameUserInputProps {
  inputData: IUserInput;
  playerName?: string;
  onCloseInput: () => void;
  onSetData: (data: IUserAction) => void;
}

const ACTION_MAP: Record<string, string> = {
  "take-coins": "coins-taken",
  "set-bet": "bet-setted",
  "new-round": "new-round",
  "show-coins": "show-coins",
};

export function GameUserInput({
  inputData,
  playerName = "",
  onCloseInput,
  onSetData,
}: GameUserInputProps) {
  const t = useTranslations();

  const [selected, setSelected] = useState("");
  const [hasSelected, setHasSelected] = useState(false);

  const title = useMemo(() => {
    switch (inputData.action) {
      case "take-coins":
        return t("text.take_coins");
      case "set-bet":
        return t("text.set_bet");
      case "new-round":
        return t("text.select_next");
      default:
        return "";
    }
  }, [inputData.action, t]);

  const buttons = inputData.action === "show-coins" ? [] : inputData.list;
  const action = ACTION_MAP[inputData.action] ?? "";

  const confirm = (value?: string) => {
    onSetData({ action, value: value ?? selected });
    onCloseInput();
  };

  // Auto-answer when the input carries a timeout (unused in the current
  // flows, kept for protocol parity with the Nuxt app).
  useEffect(() => {
    if (inputData.timeOut == null) return;
    const value =
      inputData.action === "take-coins"
        ? Math.floor(Math.random() * 4).toString()
        : (inputData.list[
            Math.floor(Math.random() * (inputData.list.length + 1))
          ] ?? "");
    const timer = setTimeout(() => {
      setSelected(value);
      confirm(value);
    }, inputData.timeOut);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputData]);

  if (inputData.action === "show-coins") {
    return (
      <div className="show-coins">
        <div className="show-coins-panel">
          <span className="show-coins-text">{t("text.show_coins_prompt")}</span>
          <button
            className="show-coins-btn"
            type="button"
            onClick={() => confirm()}
          >
            {t("button.show")}
          </button>
        </div>
      </div>
    );
  }

  // Title for coin/bet picker and new-round (design 6a).
  const showTitle =
    (inputData.action === "take-coins" ||
      inputData.action === "set-bet" ||
      inputData.action === "new-round") &&
    Boolean(title);

  return (
    <div className={`game-input-data ${inputData.action}`}>
      {showTitle && <div className="turn-panel">{title}</div>}
      <div className="bet-row">
        {inputData.list.length === 0 ? (
          <div className="no-bets-msg">{t("no_viable_bet")}</div>
        ) : (
          buttons.map((btn) => (
            <button
              key={btn}
              className={`bet-cell ${btn === selected ? "selected" : ""}`}
              type="button"
              onClick={() => {
                setSelected(btn);
                setHasSelected(true);
              }}
            >
              {inputData.action === "new-round" && btn === playerName
                ? t("You")
                : btn}
            </button>
          ))
        )}
        <button
          className="bet-check"
          disabled={!hasSelected && inputData.list.length !== 0}
          type="button"
          aria-label={t("button.continue")}
          onClick={() => confirm()}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
