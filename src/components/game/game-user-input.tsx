"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import type { IUserAction, IUserInput } from "@/types/game";

interface GameUserInputProps {
  inputData: IUserInput;
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
        <button className="btn btn-custom m-0" type="button" onClick={() => confirm()}>
          {t("button.show")}
        </button>
      </div>
    );
  }

  return (
    <div className={`game-input-data card ${inputData.action}`}>
      <div className="action-header">
        <h5>{title}</h5>
      </div>
      <div className="action-body">
        {inputData.action !== "new-round" && (
          <div className="input-field">
            {inputData.list.length === 0 ? (
              <div className="no-bets-msg">{t("no_viable_bet")}</div>
            ) : (
              <input
                id="input-data"
                className="input-coins"
                type="text"
                name="input-data"
                value={selected}
                disabled
                readOnly
              />
            )}
          </div>
        )}
        <div className="btn-actions-group">
          {buttons.map((btn) => (
            <button
              key={btn}
              className={inputData.action !== "new-round" ? "btn-square" : "btn-wide"}
              type="button"
              disabled={btn === selected}
              onClick={() => {
                setSelected(btn);
                setHasSelected(true);
              }}
            >
              {btn}
            </button>
          ))}
        </div>
        <div className="btn-group mt-0!">
          <button
            className="btn btn-check"
            disabled={!hasSelected && inputData.list.length !== 0}
            type="button"
            onClick={() => confirm()}
          >
            <Check className="inline h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
