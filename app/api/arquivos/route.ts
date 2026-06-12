import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;
// PNCP recusa IPs de nuvem dos EUA -> rodar em São Paulo (IP BR)
export const preferredRegion = "gru1";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchArquivos(cnpj: string, ano: string, seq: string, timeoutMs: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(
      `https://pncp.gov.br/pncp-api/v1/orgaos/${cnpj}/compras/${ano}/${seq}/arquivos`,
      { headers: { Accept: "application/json", "User-Agent": UA }, signal: ctrl.signal, cache: "no-store" }
    );
    if (!r.ok) return { ok: false, status: r.status, data: [] as unknown[] };
    const d = await r.json();
    return { ok: true, status: 200, data: Array.isArray(d) ? d : [] };
  } finally {
    clearTimeout(t);
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const cnpj = sp.get("cnpj");
  const ano = sp.get("ano");
  const seq = sp.get("seq");
  const debug = sp.get("debug");
  if (!cnpj || !ano || !seq) return Response.json([]);

  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchArquivos(cnpj, ano, seq, 18000);
      if (res.ok) return Response.json(res.data);
      lastErr = "http " + res.status;
    } catch (e) {
      const cause = (e as { cause?: { code?: string; message?: string } }).cause;
      lastErr =
        (e as Error).name === "AbortError"
          ? "timeout"
          : `${(e as Error).message}${cause ? " | " + (cause.code || cause.message) : ""}`;
    }
  }
  if (debug) return Response.json({ error: lastErr || "desconhecido" });
  return Response.json([]);
}
