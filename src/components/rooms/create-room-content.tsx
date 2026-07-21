"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createPrivateRoom,
  createPublicRoom,
  joinPrivateRoom,
  joinPublicRoom,
} from "@/lib/rooms";
import { useAuthStore } from "@/stores/auth";
import { useErrorStore, errorIsEmpty } from "@/stores/error";
import { RoomType } from "@/types/enums";
import { useClientReady } from "@/hooks/use-client-ready";
import { BaseModal } from "@/components/base-modal";
import { Loading } from "@/components/loading";
import { CreateRoomForm } from "./create-room-form";

export function CreateRoomContent() {
  const t = useTranslations();
  const router = useRouter();
  const clientReady = useClientReady();
  const isLogged = useAuthStore((s) => s.user.userId !== "");
  const userName = useAuthStore((s) => s.user.userName);

  const playerName = isLogged && userName ? userName : "";

  const [processing, setProcessing] = useState(false);
  const [alertError, setAlertError] = useState("");

  const createRoom = async (
    type: RoomType,
    roomName: string,
    pName?: string,
    password?: string,
  ) => {
    if (type === RoomType.Private && !isLogged) {
      router.push("/login?redirect=/rooms/create");
      return;
    }

    setProcessing(true);

    const name = pName ?? playerName;
    const errorEmpty = () => errorIsEmpty(useErrorStore.getState());

    if (type === RoomType.Private) {
      await createPrivateRoom(roomName, password ?? "");
      if (errorEmpty()) await joinPrivateRoom(roomName);
    } else {
      await createPublicRoom(roomName, name);
      if (errorEmpty()) await joinPublicRoom(roomName, name);
    }

    if (errorEmpty()) {
      setAlertError("");
      router.push(`/rooms/${encodeURIComponent(roomName)}`);
      return;
    }

    const error = useErrorStore.getState();
    setAlertError(error.details || error.message);
    setProcessing(false);
  };

  if (!clientReady) return null;

  if (processing) {
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
      <BaseModal>
        <CreateRoomForm
          roomType={RoomType.Public}
          playerName={playerName}
          onCloseModal={() => router.back()}
          onCreateRoom={(type, roomName, pName, password) =>
            void createRoom(type, roomName, pName, password)
          }
        />
      </BaseModal>
    </div>
  );
}
