"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  joinPrivateRoom,
  joinPublicRoom,
  joinRoomAsGuest,
} from "@/lib/rooms";
import { useAuthStore } from "@/stores/auth";
import { useErrorStore, errorIsEmpty } from "@/stores/error";
import { BaseModal } from "@/components/base-modal";
import { Loading } from "@/components/loading";
import { GuestPasswordForm } from "./guest-password-form";
import { JoinPublicForm } from "./join-public-form";

/**
 * Join-by-link flow (port of Nuxt `rooms/join/[roomname].vue`): tries a
 * public join with the session player name, falling back to a private join
 * or a guest password prompt depending on the API error.
 */
export function JoinRoomContent({ roomName }: { roomName: string }) {
  const t = useTranslations();
  const router = useRouter();
  const isReady = useAuthStore((s) => s.isReady);

  const [alertError, setAlertError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showJoinPublicForm, setShowJoinPublicForm] = useState(false);
  const [showGuestPasswordForm, setShowGuestPasswordForm] = useState(false);

  const playerNameRef = useRef("");
  const startedRef = useRef(false);

  const joinRoom = async (room: string, pName: string, password = "") => {
    setShowJoinPublicForm(false);
    setShowGuestPasswordForm(false);

    playerNameRef.current = pName;

    let doJoin = false;
    setProcessing(true);

    if (password !== "") {
      await joinRoomAsGuest(room, pName, password);
    } else {
      await joinPublicRoom(room, pName);
    }

    const error = useErrorStore.getState();
    if (errorIsEmpty(error)) {
      doJoin = true;
    } else if (error.details === "not_public_room") {
      error.reset();
      if (useAuthStore.getState().user.userId !== "") {
        await joinPrivateRoom(room);
        doJoin = errorIsEmpty(useErrorStore.getState());
      } else {
        setShowGuestPasswordForm(true);
      }
    } else if (error.details === "user_not_registered_in_room") {
      error.reset();
      setShowGuestPasswordForm(true);
    } else {
      setAlertError(error.details || error.message);
    }

    setProcessing(false);

    if (doJoin) router.push(`/rooms/${encodeURIComponent(room)}`);
  };

  // Auto-join once the session is hydrated (logged users join with their
  // user name; anonymous users are asked for a player name first).
  useEffect(() => {
    if (!isReady || startedRef.current) return;
    startedRef.current = true;

    const auth = useAuthStore.getState();
    const name = auth.user.userId !== "" ? auth.user.userName : "";

    // Deferred to a microtask so the effect body does not set state
    // synchronously.
    void Promise.resolve().then(() => {
      if (name !== "") {
        playerNameRef.current = name;
        return joinRoom(roomName, name);
      }
      setShowJoinPublicForm(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, roomName]);

  if (processing || !isReady) {
    return (
      <BaseModal>
        <Loading />
      </BaseModal>
    );
  }

  if (alertError !== "") {
    return (
      <div className="alert-error">
        <h4 className="text-center text-red-600">{t(`error.${alertError}`)}</h4>
        <div className="text-right">
          <button className="btn m-3 mt-8" onClick={() => router.push("/rooms")}>
            {t("button.back")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full">
      {showJoinPublicForm && (
        <div className="card">
          <h2 className="mt-4 text-center">
            {t("pages.join_room", { roomName })}
          </h2>
          <JoinPublicForm
            roomName={roomName}
            onCloseModal={() => setShowJoinPublicForm(false)}
            onSetPlayer={(player) => void joinRoom(roomName, player)}
          />
        </div>
      )}
      {showGuestPasswordForm && (
        <div className="card">
          <h2 className="mt-4 text-center">{t("room.private")}</h2>
          <GuestPasswordForm
            onCloseModal={() => setShowGuestPasswordForm(false)}
            onSetData={(password) =>
              void joinRoom(roomName, playerNameRef.current, password)
            }
          />
        </div>
      )}
    </div>
  );
}
