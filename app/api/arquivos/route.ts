import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const cnpj = sp.get("cnpj");
  const ano = sp.get("ano");
  const seq = sp.get("seq");
  if (!cnpj || !ano || !seq) return Response.json([]);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch(`https://pncp.gov.br/pncp-api/v1/orgaos/${cnpj}/compras/${ano}/${seq}/arquivos`, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 SolugovRelue/1.0" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(t);
    if (!r.ok) return Response.json([]);
    const d = await r.json();
    return Response.json(Array.isArray(d) ? d : []);
  } catch {
    return Response.json([]);
  }
}
