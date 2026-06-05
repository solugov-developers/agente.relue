import { Pool } from "pg";
import { scryptSync, randomBytes } from "node:crypto";
import fs from "node:fs";

// carrega .env.local
for (const line of fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const l = line.trim();
  if (l && !l.startsWith("#") && l.includes("=")) {
    const i = l.indexOf("=");
    process.env[l.slice(0, i).trim()] ??= l.slice(i + 1).trim();
  }
}

const hash = (pw) => {
  const salt = randomBytes(16);
  return salt.toString("hex") + ":" + scryptSync(pw, salt, 64).toString("hex");
};
const genpw = () => randomBytes(12).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: { rejectUnauthorized: false },
});

const users = ["contato@solugov.com", "licitacao.solugov@gmail.com"];

await pool.query(
  "create table if not exists public.app_users (email text primary key, pass_hash text not null, created_at timestamptz default now())"
);

console.log("\n=== CREDENCIAIS (anote — só aparecem agora) ===");
for (const email of users) {
  const pw = genpw();
  await pool.query(
    "insert into public.app_users(email, pass_hash) values ($1,$2) on conflict (email) do update set pass_hash = excluded.pass_hash",
    [email, hash(pw)]
  );
  console.log(`  ${email}  ->  ${pw}`);
}
console.log("===============================================\n");
await pool.end();
