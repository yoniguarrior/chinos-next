"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import type { Translate } from "@/lib/schemas";
import { updateRoomData } from "@/lib/rooms";
import { checkUserName } from "@/lib/user";
import { useErrorStore, errorIsEmpty } from "@/stores/error";
import type { IURoom } from "@/types/user";
import { BaseModal } from "@/components/base-modal";
import { PasswordInput } from "@/components/password-input";
import { AddUserForm } from "./add-user-form";
import { RemoveUserForm } from "./remove-user-form";

interface EditRoomFormProps {
  roomData?: IURoom;
  onCloseModal: () => void;
  onRefreshData: () => void;
}

interface EditRoomFields {
  roomName: string;
  changePass: boolean;
  password?: string;
}

export function EditRoomForm({
  roomData,
  onCloseModal,
  onRefreshData,
}: EditRoomFormProps) {
  const t = useTranslations();
  const tr = t as Translate;

  const schema = useMemo(
    () =>
      z
        .object({
          roomName: z
            .string()
            .nonempty(tr("error.required", { field: t("room.name") }))
            .min(4, tr("error.min_chars", { min: 4 }))
            .max(20, tr("error.max_chars", { max: 20 })),
          changePass: z.boolean(),
          password: z.string().optional(),
        })
        .refine(
          (data) =>
            !data.changePass || (!!data.password && data.password.length >= 8),
          { message: tr("error.min_chars", { min: 8 }), path: ["password"] },
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm<EditRoomFields>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      roomName: roomData?.roomName ?? "",
      changePass: false,
      password: "",
    },
  });

  const changePass = useWatch({ control, name: "changePass" });

  const [users, setUsers] = useState<string[]>(
    roomData?.users ? [...roomData.users] : [],
  );
  const [showForm, setShowForm] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [showRemoveUser, setShowRemoveUser] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [usersChanged, setUsersChanged] = useState(false);
  const [alertError, setAlertError] = useState("");
  const [userToRemove, setUserToRemove] = useState("");

  const canSave = isValid || usersChanged;

  const openRemoveUser = (name: string) => {
    setUserToRemove(name);
    setShowRemoveUser(true);
  };

  const handleRemoveUser = (name: string) => {
    setUsers((prev) => prev.filter((u) => u !== name));
    setUsersChanged(true);
  };

  const handleAddUser = async (name: string) => {
    if (users.includes(name)) {
      setAlertError("name_exists");
      return;
    }

    if (await checkUserName(name)) {
      setUsersChanged(true);
      setUsers((prev) => [...prev, name]);
    } else {
      setAlertError("user_not_found");
    }
  };

  const onSubmit = async (data: EditRoomFields) => {
    setProcessing(true);
    useErrorStore.getState().reset();

    await updateRoomData({
      roomName: data.roomName,
      password: data.changePass ? data.password : undefined,
      users,
    });

    const error = useErrorStore.getState();
    if (errorIsEmpty(error)) {
      setUsersChanged(false);
      setShowForm(false);
      setShowResult(true);
      onRefreshData();
      setTimeout(() => {
        setShowResult(false);
        onCloseModal();
      }, 1800);
    } else {
      setAlertError(error.details || error.message);
    }

    setProcessing(false);
  };

  return (
    <>
      {showForm && (
        <form className="card-body" onSubmit={handleSubmit(onSubmit)}>
          {alertError && (
            <div className="form-error">{t(`error.${alertError}`)}</div>
          )}
          <h4>
            {t("edit_room.title")} <b>{roomData?.roomName ?? ""}</b>
          </h4>
          <div className="form-field">
            <input
              type="text"
              placeholder={t("room.name")}
              className="form-input border border-neutral-300"
              {...register("roomName")}
            />
            {errors.roomName && (
              <p className="mt-1 text-sm text-red-500">
                {errors.roomName.message}
              </p>
            )}
          </div>
          <div className="mb-2">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" {...register("changePass")} />
              {t("edit_room.change_password")}
            </label>
          </div>
          {changePass && (
            <div className="form-field">
              <PasswordInput
                autoComplete="new-password"
                placeholder={t("login.password")}
                className="form-input border border-neutral-300 pr-9"
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>
          )}

          <div className="my-users">
            <div className="list mb-4 mt-2">
              <div className="list-header">
                <div className="list-row grid-cols-[auto_40px]">
                  <div className="list-cell first">{t("users")}</div>
                  <div className="list-cell actions" />
                </div>
              </div>
              <div className="list-body">
                {users.map((u) => (
                  <div key={u} className="list-row grid-cols-[auto_40px]">
                    <div className="list-cell first">{u}</div>
                    <div className="list-cell actions">
                      {u !== roomData?.owner && (
                        <button
                          type="button"
                          className="btn actions"
                          title={t("button.delete_user")}
                          onClick={() => openRemoveUser(u)}
                        >
                          <X className="inline h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {showRemoveUser && (
              <BaseModal>
                <RemoveUserForm
                  user={userToRemove}
                  onCloseModal={() => setShowRemoveUser(false)}
                  onConfirmRemove={handleRemoveUser}
                />
              </BaseModal>
            )}
          </div>

          <div className="add_room">
            <div className="flex w-full justify-end">
              <button
                type="button"
                className="btn btn-square"
                title={t("button.add_user")}
                onClick={() => setShowAddUser(true)}
              >
                <Plus className="inline h-5 w-5" />
              </button>
            </div>
            {showAddUser && (
              <BaseModal>
                <AddUserForm
                  onCloseModal={() => setShowAddUser(false)}
                  onAddUser={(name) => void handleAddUser(name)}
                />
              </BaseModal>
            )}
          </div>

          <div className="mt-4 flex items-baseline justify-center">
            <button
              className="card-btn"
              type="submit"
              disabled={!canSave || processing}
            >
              {t("button.save")}
            </button>
            <button className="card-btn" type="button" onClick={onCloseModal}>
              {t("button.cancel")}
            </button>
          </div>
        </form>
      )}
      {showResult && (
        <div className="result-message">
          <h4 className="w-full text-center">{t("room.updated")}</h4>
        </div>
      )}
    </>
  );
}
