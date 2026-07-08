import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

type Cached = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongooseCache: Cached | undefined;
}

const cached = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!MONGODB_URI) throw new Error("Missing MONGODB_URI");

  cached.promise ??= mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
    dbName: process.env.MONGODB_DB || "sprint",
  });

  cached.conn = await cached.promise;
  return cached.conn;
}
