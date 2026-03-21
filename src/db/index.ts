import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { validateEnv } from "@/lib/env";

import * as schema from "./schema";

type DrizzleDatabase = ReturnType<typeof drizzle>;

type GlobalWithDb = typeof globalThis & {
  __otecPool?: Pool;
  __otecDb?: DrizzleDatabase;
};

export function getDb() {
  const env = validateEnv();
  const databaseUrl = env.DATABASE_URL;
  const databaseSsl = process.env.DATABASE_SSL?.trim().toLowerCase();
  const poolMax = Number.parseInt(process.env.DB_POOL_MAX ?? "10", 10);

  const sslEnabled =
    databaseSsl === "true" ||
    (databaseSsl !== "false" && process.env.NODE_ENV === "production");

  const globalDb = globalThis as GlobalWithDb;

  if (!globalDb.__otecPool) {
    globalDb.__otecPool = new Pool({
      connectionString: databaseUrl,
      max: poolMax,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    });
  }

  if (!globalDb.__otecDb) {
    globalDb.__otecDb = drizzle(globalDb.__otecPool, { schema });
  }

  return globalDb.__otecDb;
}
