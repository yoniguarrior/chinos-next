import mongoose, { Schema, type Model } from "mongoose";
import bcrypt from "bcryptjs";
import { wonDataSchema, type WonData } from "./ranking";

export const USER_ROLES = ["user", "prime", "moderator", "admin"] as const;
export type Role = (typeof USER_ROLES)[number];

export interface User {
  userName: string;
  email?: string;
  password: string;
  roles?: Role[];
  emailVerifyKey: string;
  emailVerifyExpires: Date;
  emailVerified: boolean;
  loginAttempts: number;
  blockExpires: Date;
  playedGames: number;
  wonGames: WonData;
  lostGames: number;
  points: number;
  created_at?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<User>(
  {
    userName: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 10,
      trim: true,
      unique: true,
    },
    email: { type: String, trim: true, lowercase: true, default: "" },
    password: { type: String, required: true },
    roles: { type: [String], enum: USER_ROLES, default: ["user"] },
    emailVerifyKey: { type: String, default: "" },
    emailVerifyExpires: { type: Date, default: Date.now },
    emailVerified: { type: Boolean, default: false },
    loginAttempts: { type: Number, default: 0 },
    blockExpires: { type: Date, default: Date.now },
    playedGames: { type: Number, default: 0 },
    wonGames: {
      type: wonDataSchema,
      default: { first: 0, won2: 0, won3: 0, won4: 0, won5: 0 },
    },
    lostGames: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "created_at" } },
);

userSchema.pre("save", async function () {
  if (!this.password || !this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.pre(
  "updateOne",
  { document: false, query: true },
  async function () {
    const update = this.getUpdate() as { password?: string } | null;
    if (!update?.password) return;
    update.password = await bcrypt.hash(update.password, 10);
    this.setUpdate(update);
  },
);

export const UserModel: Model<User> =
  (mongoose.models.User as Model<User>) ??
  mongoose.model<User>("User", userSchema);
