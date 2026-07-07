import mongoose, { Schema, type Model } from "mongoose";

export interface ForgotPassword {
  email: string;
  verification: string;
  firstUsed: boolean;
  finalUsed: boolean;
  expires: Date;
  ipRequest: string;
  browserRequest: string;
  ipChanged?: string;
  browserChanged?: string;
  created_at?: Date;
  updatedAt?: Date;
}

const forgotPasswordSchema = new Schema<ForgotPassword>(
  {
    email: { type: String, required: true },
    verification: { type: String },
    firstUsed: { type: Boolean, default: false },
    finalUsed: { type: Boolean, default: false },
    expires: { type: Date },
    ipRequest: { type: String },
    browserRequest: { type: String },
    ipChanged: { type: String },
    browserChanged: { type: String },
  },
  { timestamps: { createdAt: "created_at" } },
);

export const ForgotPasswordModel: Model<ForgotPassword> =
  (mongoose.models.ForgotPassword as Model<ForgotPassword>) ??
  mongoose.model<ForgotPassword>("ForgotPassword", forgotPasswordSchema);
