"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import type { IURoom } from "@/types/user";
import { BaseModal } from "@/components/base-modal";
import { AddRoomForm } from "./add-room-form";
import { EditRoomForm } from "./edit-room-form";
import { RemoveRoomForm } from "./remove-room-form";
import { UserRoomsList } from "./user-rooms-list";

interface RoomsDataProps {
  myRooms?: IURoom[];
  othersRooms?: IURoom[];
  onNeedsRefresh: () => void;
}

export function RoomsData({
  myRooms,
  othersRooms,
  onNeedsRefresh,
}: RoomsDataProps) {
  const t = useTranslations();

  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showEditRoom, setShowEditRoom] = useState(false);
  const [showRemoveRoom, setShowRemoveRoom] = useState(false);
  const [removeRoomName, setRemoveRoomName] = useState("");
  const [editRoomData, setEditRoomData] = useState<IURoom | undefined>();

  const openEdit = (roomName: string) => {
    setEditRoomData(myRooms?.find((r) => r.roomName === roomName));
    setShowEditRoom(true);
  };

  const openRemove = (roomName: string) => {
    setRemoveRoomName(roomName);
    setShowRemoveRoom(true);
  };

  return (
    <div className="list-rooms">
      <section className="list-my-rooms">
        <div className="list-rooms-head">
          <h5 className="list-title">{t("list.my_rooms")}</h5>
          <button
            type="button"
            className="list-rooms-add-btn"
            title={t("button.add_room")}
            onClick={() => setShowAddRoom(true)}
          >
            <Plus className="h-4 w-4" />
            <span>{t("button.add_room")}</span>
          </button>
        </div>

        {myRooms && myRooms.length ? (
          <div className="my-rooms">
            <UserRoomsList
              rooms={myRooms}
              owner
              onEditRoom={openEdit}
              onRemoveRoom={openRemove}
            />
            {showEditRoom && (
              <BaseModal>
                <EditRoomForm
                  roomData={editRoomData}
                  onCloseModal={() => setShowEditRoom(false)}
                  onRefreshData={onNeedsRefresh}
                />
              </BaseModal>
            )}
            {showRemoveRoom && (
              <BaseModal>
                <RemoveRoomForm
                  roomName={removeRoomName}
                  onCloseModal={() => setShowRemoveRoom(false)}
                  onRefreshData={onNeedsRefresh}
                />
              </BaseModal>
            )}
          </div>
        ) : (
          <p className="list-rooms-empty">{t("room.no_room-owner")}</p>
        )}

        {showAddRoom && (
          <BaseModal>
            <AddRoomForm
              onCloseModal={() => setShowAddRoom(false)}
              onRefreshData={onNeedsRefresh}
            />
          </BaseModal>
        )}
      </section>

      <section className="list-others-rooms">
        <h5 className="list-title">{t("list.others_rooms")}</h5>
        {othersRooms && othersRooms.length ? (
          <div className="others-rooms">
            <UserRoomsList rooms={othersRooms} owner={false} />
          </div>
        ) : (
          <p className="list-rooms-empty">{t("room.no_room-user")}</p>
        )}
      </section>
    </div>
  );
}
