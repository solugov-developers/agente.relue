import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const s = await verifyToken(req.cookies.get("relue_session")?.value);
  if (!s) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ email: s.email, nome: s.nome });
}
