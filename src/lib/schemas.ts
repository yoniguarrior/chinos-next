import { z } from "zod";

/**
 * Zod schema factories (port of Nuxt `app/schemes/`). Each factory takes a
 * translate function so validation messages follow the active locale.
 */

export type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export const createLoginSch = (t: Translate) =>
  z.object({
    userName: z
      .string()
      .nonempty(t("error.required", { field: t("form.field.user_name") }))
      .regex(
        /^[\w]+$/,
        t("error.invalid_chars", { valid_chars: t("misc.valid_user_name") }),
      )
      .min(3, t("error.min_chars", { min: 3 })),
    password: z
      .string()
      .nonempty(t("error.required", { field: t("form.field.password") }))
      .min(8, t("error.min_chars", { min: 8 })),
  });

export type LoginType = z.output<ReturnType<typeof createLoginSch>>;

export const createRegisterSch = (t: Translate) =>
  z
    .object({
      userName: z
        .string()
        .nonempty(t("error.required", { field: t("form.field.user_name") }))
        .regex(
          /^[\w]+$/,
          t("error.invalid_chars", { valid_chars: t("misc.valid_user_name") }),
        )
        .min(3, t("error.min_chars", { min: 3 }))
        .max(10, t("error.max_chars", { max: 10 })),
      email: z
        .union([z.literal(""), z.email(t("error.invalid_email"))])
        .optional(),
      password: z
        .string()
        .nonempty(t("error.required", { field: t("form.field.password") }))
        .min(8, t("error.min_chars", { min: 8 })),
      confirm: z.string(),
    })
    .refine((data) => data.confirm === data.password, {
      message: t("error.password_mismatch"),
      path: ["confirm"],
    });

export type RegisterType = z.output<ReturnType<typeof createRegisterSch>>;

export const createForgotPassSch = (t: Translate) =>
  z.object({
    email: z
      .email(t("error.invalid_email"))
      .nonempty(t("error.required", { field: t("form.field.email") })),
  });

export type ForgotPassType = z.output<ReturnType<typeof createForgotPassSch>>;

export const createResetPassSch = (t: Translate) =>
  z
    .object({
      password: z.string().min(8, t("error.min_chars", { min: 8 })),
      confirm: z.string(),
    })
    .refine((data) => data.password === data.confirm, {
      message: t("error.password_mismatch"),
      path: ["confirm"],
    });

export type ResetPassType = z.output<ReturnType<typeof createResetPassSch>>;

export const createChangePassSch = (t: Translate) =>
  z
    .object({
      oldPassword: z
        .string()
        .nonempty(t("error.required", { field: t("profile.oldpassword") })),
      newPassword: z
        .string()
        .nonempty(t("error.required", { field: t("profile.newpassword") }))
        .min(8, t("error.min_chars", { min: 8 })),
      confirm: z.string(),
    })
    .refine((data) => data.confirm === data.newPassword, {
      message: t("error.password_mismatch"),
      path: ["confirm"],
    });

export type ChangePassType = z.output<ReturnType<typeof createChangePassSch>>;

export const createEditUserSch = (t: Translate) =>
  z.object({
    email: z.union([z.literal(""), z.email(t("error.invalid_email"))]),
  });

export type EditUserType = z.output<ReturnType<typeof createEditUserSch>>;

export const createCheckPlayerSch = (t: Translate) =>
  z.object({
    roomName: z
      .string()
      .nonempty(t("error.required", { field: t("form.field.room_name") }))
      .regex(/^[\w]+$/)
      .min(4, t("error.min_chars", { min: 4 }))
      .max(20, t("error.max_chars", { max: 20 })),
    playerName: z
      .string()
      .nonempty(t("error.required", { field: t("form.field.user_name") }))
      .regex(/^[\w]+$/)
      .min(3, t("error.min_chars", { min: 3 }))
      .max(10, t("error.max_chars", { max: 10 })),
  });

export type CheckPlayerType = z.output<ReturnType<typeof createCheckPlayerSch>>;

export const createCheckUserSch = (t: Translate) =>
  z.object({
    playerName: z
      .string()
      .nonempty(t("error.required", { field: t("form.field.room_name") }))
      .regex(/^[\w]+$/)
      .min(3, t("error.min_chars", { min: 3 }))
      .max(10, t("error.max_chars", { max: 10 })),
  });

export type CheckUserType = z.output<ReturnType<typeof createCheckUserSch>>;

export const createCreatePrivateSch = (t: Translate) =>
  z.object({
    roomName: z
      .string()
      .nonempty(t("error.required", { field: t("form.field.room_name") }))
      .regex(/^[\w]+$/)
      .min(3, t("error.min_chars", { min: 3 }))
      .max(20, t("error.max_chars", { max: 20 })),
    password: z
      .string()
      .nonempty(t("error.required", { field: t("form.field.password") }))
      .min(8, t("error.min_chars", { min: 8 })),
  });

export type CreatePrivateType = z.output<
  ReturnType<typeof createCreatePrivateSch>
>;

export const createCreatePublicSch = (t: Translate) =>
  z.object({
    roomName: z
      .string()
      .nonempty(t("error.required", { field: t("form.field.room_name") }))
      .regex(/^[\w]+$/)
      .min(3, t("error.min_chars", { min: 3 }))
      .max(20, t("error.max_chars", { max: 20 })),
    playerName: z
      .string()
      .nonempty(t("error.required", { field: t("form.field.player_name") }))
      .regex(/^[\w]+$/)
      .min(3, t("error.min_chars", { min: 3 }))
      .max(10, t("error.max_chars", { max: 10 })),
  });

export type CreatePublicType = z.output<
  ReturnType<typeof createCreatePublicSch>
>;

export const createJoinGuestSch = (t: Translate) =>
  z.object({
    roomName: z
      .string()
      .nonempty(t("error.required", { field: t("form.field.room_name") }))
      .regex(/^[\w]+$/)
      .min(4, t("error.min_chars", { min: 4 }))
      .max(20, t("error.max_chars", { max: 20 })),
    password: z
      .string()
      .nonempty(t("error.required", { field: t("form.field.password") }))
      .min(8, t("error.min_chars", { min: 8 })),
    playerName: z
      .string()
      .nonempty(t("error.required", { field: t("form.field.player_name") }))
      .regex(/^[\w]+$/)
      .min(3, t("error.min_chars", { min: 3 }))
      .max(10, t("error.max_chars", { max: 10 })),
  });

export type JoinGuestType = z.output<ReturnType<typeof createJoinGuestSch>>;

export const createJoinPublicSch = (t: Translate) =>
  z.object({
    playerName: z
      .string()
      .nonempty(t("error.required", { field: t("form.field.player_name") }))
      .regex(/^[\w]+$/)
      .min(3, t("error.min_chars", { min: 3 }))
      .max(10, t("error.max_chars", { max: 10 })),
  });

export type JoinPublicType = z.output<ReturnType<typeof createJoinPublicSch>>;

export const createManageRoomUsersSch = (t: Translate) =>
  z.object({
    userName: z
      .string()
      .nonempty(t("error.required", { field: t("form.field.player_name") }))
      .regex(/^[\w]+$/)
      .min(3, t("error.min_chars", { min: 3 }))
      .max(10, t("error.max_chars", { max: 10 })),
  });

export type ManageRoomUsersType = z.output<
  ReturnType<typeof createManageRoomUsersSch>
>;

export const createUpdateRoomSch = (t: Translate) =>
  z.object({
    roomName: z
      .string()
      .regex(/^[\w]+$/)
      .min(4, t("error.min_chars", { min: 4 }))
      .max(20, t("error.max_chars", { max: 20 }))
      .optional(),
    password: z
      .string()
      .min(8, t("error.min_chars", { min: 8 }))
      .optional(),
    users: z
      .array(
        z
          .string()
          .regex(/^[\w]+$/)
          .min(3, t("error.min_chars", { min: 3 }))
          .max(10, t("error.max_chars", { max: 10 })),
      )
      .optional(),
  });

export type UpdateRoomType = z.output<ReturnType<typeof createUpdateRoomSch>>;
