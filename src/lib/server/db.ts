import mongoose from "mongoose";
import { serverConfig } from "./config";

/**
 * Cached Mongoose connection (standard Next.js pattern). The cache lives on
 * globalThis so hot-reloads in dev and the custom server share one connection.
 */

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalWithMongoose = globalThis as typeof globalThis & {
  __mongooseCache?: MongooseCache;
};

const cache: MongooseCache = (globalWithMongoose.__mongooseCache ??= {
  conn: null,
  promise: null,
});

export async function dbConnect(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    const uri = serverConfig.mongodbUri();
    if (!uri) throw new Error("MONGODB_URI is not configured");

    cache.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }

  return cache.conn;
}
