"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SquareChevronDown, SquareChevronUp } from "lucide-react";
import { profile } from "@/lib/user";
import { getUserRanking } from "@/lib/ranking";
import { useAuthStore } from "@/stores/auth";
import { useRequireAuth } from "@/hooks/use-require-auth";
import type { IURanking } from "@/types/ranking";
import type { IURoom, IUser } from "@/types/user";
import { BaseModal } from "@/components/base-modal";
import { Loading } from "@/components/loading";
import { ChangePassword } from "./change-password";
import { EditUser } from "./edit-user";
import { RoomsData } from "./rooms-data";
import { UserData } from "./user-data";
import { UserRankingData } from "./user-ranking-data";

export function ProfileContent() {
  const t = useTranslations();
  const { isReady, isLogged } = useRequireAuth();
  const userName = useAuthStore((s) => s.user.userName);

  const [editMode, setEditMode] = useState(false);
  const [showChangePass, setShowChangePass] = useState(false);
  const [showRooms, setShowRooms] = useState(false);
  const [showRanking, setShowRanking] = useState(false);

  const [userData, setUserData] = useState<IUser | undefined>();
  const [myRooms, setMyRooms] = useState<IURoom[] | undefined>();
  const [othersRooms, setOthersRooms] = useState<IURoom[] | undefined>();
  const [userRanking, setUserRanking] = useState<IURanking | undefined>();

  const refreshRanking = useCallback(() => {
    void getUserRanking().then((ranking) => setUserRanking(ranking));
  }, []);

  const refreshAll = useCallback(() => {
    void profile().then((data) => {
      setUserData(data);
      setMyRooms(data?.rooms.filter((r) => r.owner === userName));
      setOthersRooms(data?.rooms.filter((r) => r.owner !== userName));
    });
    refreshRanking();
  }, [userName, refreshRanking]);

  useEffect(() => {
    if (isReady && isLogged) refreshAll();
  }, [isReady, isLogged, refreshAll]);

  if (!isReady || !isLogged) {
    return (
      <BaseModal>
        <Loading />
      </BaseModal>
    );
  }

  return (
    <div className="mx-auto w-full">
      <div className="user-profile border-b">
        {editMode ? (
          <EditUser user={userData} onCloseEdit={() => setEditMode(false)} />
        ) : (
          <UserData user={userData} />
        )}

        <hr />

        {!editMode && (
          <div className="flex items-center justify-center py-4">
            <button
              className="card-btn mr-2"
              type="button"
              onClick={() => setEditMode(true)}
            >
              {t("button.edit")}
            </button>
            <button
              className="card-btn"
              type="button"
              onClick={() => setShowChangePass(true)}
            >
              {t("button.change-pass")}
            </button>
          </div>
        )}

        {showChangePass && (
          <BaseModal>
            <ChangePassword onCloseModal={() => setShowChangePass(false)} />
          </BaseModal>
        )}
      </div>

      <div className="rooms-data mt-6">
        <div className="toggle-tab">
          <h4 className="m-0">{t("private_rooms")}</h4>
          <button
            type="button"
            className="icon-btn text-3xl align-middle"
            onClick={() => setShowRooms((v) => !v)}
          >
            {showRooms ? (
              <SquareChevronUp className="inline h-7 w-7" />
            ) : (
              <SquareChevronDown className="inline h-7 w-7" />
            )}
          </button>
        </div>
        {showRooms && (
          <RoomsData
            myRooms={myRooms}
            othersRooms={othersRooms}
            onNeedsRefresh={refreshAll}
          />
        )}
      </div>

      <div className="ranking-data mt-6">
        <div className="toggle-tab">
          <h4 className="m-0">{t("ranking.user")}</h4>
          <button
            type="button"
            className="icon-btn text-3xl align-middle"
            onClick={() => setShowRanking((v) => !v)}
          >
            {showRanking ? (
              <SquareChevronUp className="inline h-7 w-7" />
            ) : (
              <SquareChevronDown className="inline h-7 w-7" />
            )}
          </button>
        </div>
        {showRanking && (
          <UserRankingData myRanking={userRanking} onRefresh={refreshRanking} />
        )}
      </div>
    </div>
  );
}
