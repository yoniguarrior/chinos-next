"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import {
  createPrivateRoom,
  createPublicRoom,
  joinPrivateRoom,
  joinPublicRoom,
  listPrivates,
  listPublics,
} from "@/lib/rooms";
import { useAuthStore } from "@/stores/auth";
import { useErrorStore, errorIsEmpty } from "@/stores/error";
import { RoomType } from "@/types/enums";
import type { IRoom } from "@/types/room";
import { BaseModal } from "@/components/base-modal";
import { Loading } from "@/components/loading";
import { CreateRoomForm } from "./create-room-form";
import { JoinPublicForm } from "./join-public-form";
import { RoomsList } from "./rooms-list";

export function RoomsContent() {
  const t = useTranslations();
  const router = useRouter();
  const isReady = useAuthStore((s) => s.isReady);
  const isLogged = useAuthStore((s) => s.user.userId !== "");
  const userName = useAuthStore((s) => s.user.userName);

  const [alertError, setAlertError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showJoinPublic, setShowJoinPublic] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [currentRoom, setCurrentRoom] = useState("");
  const [createType, setCreateType] = useState<RoomType>(RoomType.Public);
  const [publicRooms, setPublicRooms] = useState<IRoom[]>([]);
  const [privateRooms, setPrivateRooms] = useState<IRoom[]>([]);

  const playerName = isLogged ? userName : "";

  const refresh = useCallback(() => {
    void Promise.resolve()
      .then(async () => {
        setProcessing(true);
        setPublicRooms(await listPublics());
        setPrivateRooms(
          useAuthStore.getState().user.userId !== "" ? await listPrivates() : [],
        );
      })
      .finally(() => setProcessing(false));
  }, []);

  useEffect(() => {
    if (isReady) refresh();
  }, [isReady, isLogged, refresh]);

  // Handle create-room request. When roomName is empty we just open the
  // create form modal; otherwise we create and join the new room.
  const handleCreate = async (
    type: RoomType,
    roomName = "",
    pName?: string,
    password?: string,
  ) => {
    if (roomName === "") {
      setShowCreate(true);
      setCreateType(type);
      return;
    }

    setShowCreate(false);
    setProcessing(true);

    const errorEmpty = () => errorIsEmpty(useErrorStore.getState());

    if (type === RoomType.Private) {
      await createPrivateRoom(roomName, password ?? "");
      if (errorEmpty()) {
        await joinPrivateRoom(roomName);
        if (errorEmpty()) {
          router.push(`/rooms/${encodeURIComponent(roomName)}`);
          return;
        }
      }
    } else {
      await createPublicRoom(roomName, pName ?? "");
      if (errorEmpty()) {
        await joinPublicRoom(roomName, pName ?? "");
        if (errorEmpty()) {
          router.push(`/rooms/${encodeURIComponent(roomName)}`);
          return;
        }
      }
    }

    const error = useErrorStore.getState();
    setAlertError(error.details || error.message);
    setProcessing(false);
  };

  // Handle join-room request from the rooms list.
  const handleJoin = async (
    roomName: string,
    roomType?: RoomType,
    pName = "",
  ) => {
    setShowJoinPublic(false);
    setCurrentRoom(roomName);

    let joined = false;
    setProcessing(true);

    const errorEmpty = () => errorIsEmpty(useErrorStore.getState());

    if (roomType === RoomType.Private) {
      await joinPrivateRoom(roomName);
      joined = errorEmpty();
    } else {
      const name = isLogged ? userName : pName;

      if (name !== "") {
        await joinPublicRoom(roomName, name);
        joined = errorEmpty();
      } else {
        setShowJoinPublic(true);
      }
    }

    setProcessing(false);

    if (joined) {
      router.push(`/rooms/${encodeURIComponent(roomName)}`);
      return;
    }
    if (!errorEmpty()) {
      const error = useErrorStore.getState();
      setAlertError(error.details || error.message);
    }
  };

  // A guest supplied a player name for a public room.
  const handleSetPlayer = (name: string) => {
    void handleJoin(currentRoom, RoomType.Public, name);
  };

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
          <button
            className="btn m-3 mt-8"
            onClick={() => {
              setAlertError("");
              useErrorStore.getState().reset();
              refresh();
            }}
          >
            {t("button.back")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full">
      <div className="refresh w-full text-right">
        <button type="button" className="btn btn-square" onClick={refresh}>
          <RefreshCw className="inline h-5 w-5" />
        </button>
      </div>

      <h2 className="mt-4 text-center">{t("pages.rooms.title")}</h2>

      <h4 className="list-title">{t("list.public_rooms")}</h4>
      {publicRooms.length > 0 ? (
        <RoomsList
          rooms={publicRooms}
          onJoinRoom={(roomName, roomType) => void handleJoin(roomName, roomType)}
        />
      ) : (
        <div className="no-rooms">{t("room.no_publics")}</div>
      )}
      <div className="btn-create">
        <button className="btn" onClick={() => void handleCreate(RoomType.Public)}>
          {t("button.new_public")}
        </button>
      </div>

      {isLogged && (
        <div id="list-privates">
          <h4 className="list-title">{t("list.private_rooms")}</h4>
          {privateRooms.length > 0 ? (
            <RoomsList
              rooms={privateRooms}
              onJoinRoom={(roomName, roomType) =>
                void handleJoin(roomName, roomType)
              }
            />
          ) : (
            <div className="no-rooms">{t("room.no_privates")}</div>
          )}
          <div className="btn-create">
            <button
              className="btn m-3 mt-8"
              onClick={() => void handleCreate(RoomType.Private)}
            >
              {t("button.new_private")}
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <BaseModal>
          <CreateRoomForm
            roomType={createType}
            playerName={playerName}
            onCloseModal={() => setShowCreate(false)}
            onCreateRoom={(type, roomName, pName, password) =>
              void handleCreate(type, roomName, pName, password)
            }
          />
        </BaseModal>
      )}
      {showJoinPublic && (
        <BaseModal>
          <JoinPublicForm
            roomName={currentRoom}
            onCloseModal={() => setShowJoinPublic(false)}
            onSetPlayer={handleSetPlayer}
          />
        </BaseModal>
      )}
    </div>
  );
}
