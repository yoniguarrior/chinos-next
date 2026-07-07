import mongoose, { Schema, type Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface RefreshToken {
  userId: string;
  refreshToken: string;
  ipRequest: string;
  browserRequest: string;
  created_at?: Date;
  updatedAt?: Date;
}

const refreshTokenSchema = new Schema<RefreshToken>(
  {
    userId: { type: String, required: true },
    refreshToken: { type: String, required: true },
    ipRequest: { type: String, required: true },
    browserRequest: { type: String, required: true },
  },
  { timestamps: { createdAt: "created_at" } },
);

refreshTokenSchema.pre("save", async function () {
  if (!this.refreshToken || !this.isModified("refreshToken")) return;
  this.refreshToken = await bcrypt.hash(this.refreshToken, 10);
});

refreshTokenSchema.pre(
  "updateOne",
  { document: false, query: true },
  async function () {
    const update = this.getUpdate() as { refreshToken?: string } | null;
    if (!update?.refreshToken) return;
    update.refreshToken = await bcrypt.hash(update.refreshToken, 10);
    this.setUpdate(update);
  },
);

export const RefreshTokenModel: Model<RefreshToken> =
  (mongoose.models.RefreshToken as Model<RefreshToken>) ??
  mongoose.model<RefreshToken>("RefreshToken", refreshTokenSchema);
