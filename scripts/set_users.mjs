import { Pool } from "pg";
import { scryptSync, randomBytes } from "node:crypto";
import fs from "node:fs";

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
const pool = new Pool({
  host: process.env.PGHOST, port: Number(process.env.PGPORT ?? 5432), user: process.env.PGUSER,
  password: process.env.PGPASSWORD, database: process.env.PGDATABASE, ssl: { rejectUnauthorized: false },
});

const users = [
  { email: "licitacao.solugov@gmail.com", senha: "Solu@2025", nome: "João Gabriel" },
  { email: "contato@solugov.com", senha: "Parceira@2026", nome: "Jeniffer Araujo" },
];

await pool.query("alter table public.app_users add column if not exists nome text");
for (const u of users) {
  await pool.query(
    "insert into public.app_users(email, pass_hash, nome) values ($1,$2,$3) on conflict (email) do update set pass_hash = excluded.pass_hash, nome = excluded.nome",
    [u.email, hash(u.senha), u.nome]
  );
  console.log("set:", u.email, "→", u.nome);
}
const { rows } = await pool.query("select email, nome from public.app_users order by email");
console.log("usuários:", rows);
await pool.end();
