import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { verifyPassword } from "@/lib/passwords";
import { signToken } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let email = "";
  let password = "";
  try {
    const b = await req.json();
    email = String(b.email ?? "").trim();
    password = String(b.password ?? "");
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (!email || !password) return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 400 });

  let ok = false;
  let realEmail = email;
  let nome = "";
  try {
    const rows = await q<{ email: string; pass_hash: string; nome: string | null }>(
      "select email, pass_hash, nome from public.app_users where lower(email) = lower($1)",
      [email]
    );
    if (rows[0]) {
      ok = verifyPassword(password, rows[0].pass_hash);
      realEmail = rows[0].email;
      nome = rows[0].nome || "";
    }
  } catch (e) {
    return NextResponse.json({ error: "Erro no servidor: " + (e as Error).message }, { status: 500 });
  }
  if (!ok) return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });

  const token = await signToken(realEmail, nome);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("relue_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86400,
  });
  return res;
}
