import mongoose from "mongoose";

/**
 * One cached Mongoose connection per server instance.
 * Vercel reuses warm function instances, so caching on globalThis keeps us far
 * below the Atlas M0 500-connection cap (each instance holds a small pool).
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = globalThis as unknown as { __pbMongoose?: Cache };
const cache: Cache = g.__pbMongoose ?? (g.__pbMongoose = { conn: null, promise: null });

export class DbNotConfiguredError extends Error {
  constructor() {
    super("MONGODB_URI is not set. Add it to .env.local (see .env.example).");
    this.name = "DbNotConfiguredError";
  }
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new DbNotConfiguredError();
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        dbName: process.env.MONGODB_DB || "parentbridge",
        maxPoolSize: 5,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
        bufferCommands: false,
      })
      .catch((err) => {
        cache.promise = null;
        throw err;
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectDB() {
  if (cache.conn) await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}
