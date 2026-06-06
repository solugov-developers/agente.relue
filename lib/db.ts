import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

const pool =
  global._pgPool ??
  new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: { rejectUnauthorized: false }, // pooler do Supabase usa cert self-signed
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });
// cacheia SEMPRE (inclusive em produção/serverless) p/ não estourar conexões no pooler
global._pgPool = pool;

export async function q<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const c = await pool.connect();
  try {
    const r = await c.query(sql, params);
    return r.rows as T[];
  } finally {
    c.release();
  }
}

/** Executa SQL em transação SOMENTE LEITURA (proteção extra para o chat). */
export async function readonlyQuery<T = Record<string, unknown>>(
  sql: string
): Promise<T[]> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN TRANSACTION READ ONLY");
    const r = await c.query(sql);
    await c.query("COMMIT");
    return r.rows as T[];
  } catch (e) {
    try {
      await c.query("ROLLBACK");
    } catch {}
    throw e;
  } finally {
    c.release();
  }
}
