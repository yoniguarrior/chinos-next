import mongoose, { Schema, type Model } from "mongoose";

export interface WonData {
  first: number;
  won5: number;
  won4: number;
  won3: number;
  won2: number;
}

export const wonDataSchema = new Schema<WonData>({
  first: { type: Number, default: 0 },
  won5: { type: Number, default: 0 },
  won4: { type: Number, default: 0 },
  won3: { type: Number, default: 0 },
  won2: { type: Number, default: 0 },
});

export interface Ranking {
  userName: string;
  scoreDate: Date;
  playedRounds: number;
  wonRounds: WonData;
  lostRounds: number;
  points: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const rankingSchema = new Schema<Ranking>(
  {
    userName: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 10,
      trim: true,
    },
    scoreDate: { type: Date, default: Date.now },
    playedRounds: { type: Number, default: 0 },
    wonRounds: wonDataSchema,
    lostRounds: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "createdAt" } },
);

export const RankingModel: Model<Ranking> =
  (mongoose.models.Ranking as Model<Ranking>) ??
  mongoose.model<Ranking>("Ranking", rankingSchema);
