// Baixa o arquivo do edital no PNCP (porta padrão) e extrai o texto do PDF.
// Roda server-side em região BR (o PNCP recusa IPs de nuvem dos EUA).

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchJson(url: string, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA }, signal: ctrl.signal, cache: "no-store" });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchEditalTexto(
  cnpj: string,
  ano: string | number,
  seq: string | number,
  maxChars = 28000
): Promise<{ texto: string; titulo?: string; aviso?: string }> {
  if (!cnpj || !ano || !seq) return { texto: "" };
  const list = await fetchJson(`https://pncp.gov.br/pncp-api/v1/orgaos/${cnpj}/compras/${ano}/${seq}/arquivos`);
  const arqs: Record<string, unknown>[] = Array.isArray(list) ? list : [];
  if (!arqs.length) return { texto: "", aviso: "sem arquivos no PNCP" };

  // prefere o documento tipo "Edital"; senão o primeiro
  const alvo = arqs.find((a) => /edital/i.test(String(a.tipoDocumentoNome || a.titulo || ""))) || arqs[0];
  const doc = alvo.sequencialDocumento || 1;
  const titulo = String(alvo.titulo || "");
  const fileUrl = `https://pncp.gov.br/pncp-api/v1/orgaos/${cnpj}/compras/${ano}/${seq}/arquivos/${doc}`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  let buf: Uint8Array;
  let cd = "";
  try {
    const resp = await fetch(fileUrl, { headers: { "User-Agent": UA }, signal: ctrl.signal });
    if (!resp.ok) return { texto: "", titulo, aviso: "arquivo indisponível no PNCP" };
    cd = String(resp.headers.get("content-disposition") || "");
    buf = new Uint8Array(await resp.arrayBuffer());
  } catch {
    return { texto: "", titulo, aviso: "não consegui baixar o arquivo" };
  } finally {
    clearTimeout(t);
  }

  const isPdf = buf[0] === 0x25 && buf[1] === 0x50; // %PDF
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b; // PK (zip)
  if (isZip || /\.zip/i.test(cd)) return { texto: "", titulo, aviso: "o arquivo é um .zip (vários documentos) — leitura automática ainda não suportada" };
  if (!isPdf) return { texto: "", titulo, aviso: "formato de arquivo não suportado para leitura automática" };

  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: true });
    const clean = String(text || "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (!clean) return { texto: "", titulo, aviso: "o PDF não tem texto extraível (provável imagem/scan)" };
    return { texto: clean.slice(0, maxChars), titulo };
  } catch {
    return { texto: "", titulo, aviso: "não consegui extrair o texto do PDF" };
  }
}
