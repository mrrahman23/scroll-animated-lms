import "server-only";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

/**
 * MySQL is used when DATABASE_URL is set, e.g.
 *   mysql://USER:PASSWORD@localhost:3306/DBNAME
 * Without it the site runs entirely from the JSON files in /data.
 */
export const hasDatabase = () => Boolean(process.env.DATABASE_URL);

type Db = MySql2Database<typeof schema>;
const globalForDb = globalThis as unknown as { nytiPool?: mysql.Pool; nytiDb?: Db };

export function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  globalForDb.nytiPool ??= mysql.createPool({
    uri: process.env.DATABASE_URL,
    // Shared hosting limits concurrent connections; keep the pool small.
    connectionLimit: Number(process.env.DB_POOL_SIZE ?? 5),
    waitForConnections: true,
    enableKeepAlive: true,
    timezone: "Z",
    charset: "utf8mb4",
  });
  return globalForDb.nytiPool;
}

/** Drizzle client (reused across requests and hot reloads). */
export function db(): Db {
  globalForDb.nytiDb ??= drizzle({ client: getPool(), schema, mode: "default" });
  return globalForDb.nytiDb;
}
