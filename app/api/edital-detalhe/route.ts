import { NextRequest } from "next/server";
import { getEdital } from "@/lib/edital";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Detalhe do edital em JSON, para abrir num popup sem sair da lista.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return Response.json({ error: "id ausente" }, { status: 400 });
  const d = await getEdital(id);
  if (!d) return Response.json({ error: "não encontrado" }, { status: 404 });
  return Response.json(d, { headers: { "Cache-Control": "no-store" } });
}
