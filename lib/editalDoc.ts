// Baixa os arquivos do edital no PNCP e extrai texto de PDF, Word (.docx),
// Excel (.xlsx), ZIP e RAR (descompacta e lê os arquivos suportados de dentro).
// Roda server-side em região BR (o PNCP recusa IPs de nuvem dos EUA).

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function decodeXml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));
}

// Editais assinados repetem carimbos de assinatura eletrônica/e-protocolo em
// toda página (chega a 13% do arquivo) — puro ruído que come orçamento e
// atrapalha a IA. Remove os blocos de boilerplate mais comuns no Brasil.
function limparRuido(s: string): string {
  return s
    .replace(/Assinatura Avançada realizada por[\s\S]{0,600}?validarDocumento com o c[oó]digo:\s*\S+/gi, " ")
    .replace(/Assinado (digital|eletr[oô]nic)[a-z]*\s+por:?[\s\S]{0,240}?(https?:\/\/\S+|c[oó]digo:?\s*\S{6,})/gi, " ")
    .replace(/Inserido ao protocolo[\s\S]{0,260}?por:[^.\n]{0,140}\./gi, " ")
    .replace(/Documento assinado nos termos do Art\.[\s\S]{0,280}?(https?:\/\/\S+|c[oó]digo:?\s*\S+)/gi, " ")
    .replace(/A autenticidade (deste|do) documento pode ser (validad|conferid|verificad)[\s\S]{0,240}?(https?:\/\/\S+)/gi, " ")
    .replace(/https?:\/\/\S*validar\S*/gi, " ")
    .replace(/Assinatura Avançada realizada por:[^\n]{0,180}/gi, " ");
}

async function extractPdf(buf: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(buf);
  const { text } = await extractText(pdf, { mergePages: true });
  return String(text || "");
}

async function extractDocx(buf: Uint8Array): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
  return String(value || "");
}

async function extractXlsx(buf: Uint8Array): Promise<string> {
  const { unzipSync, strFromU8 } = await import("fflate");
  const files = unzipSync(buf);
  const ss: string[] = [];
  if (files["xl/sharedStrings.xml"]) {
    const xml = strFromU8(files["xl/sharedStrings.xml"]);
    for (const m of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) ss.push(decodeXml(m[1]));
  }
  let out = "";
  const sheets = Object.keys(files).filter((f) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(f)).sort();
  for (const sn of sheets) {
    const xml = strFromU8(files[sn]);
    for (const row of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells: string[] = [];
      for (const c of row[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
        const t = (c[1].match(/\bt="([^"]+)"/) || [])[1];
        const body = c[2];
        if (t === "inlineStr") {
          const is = body.match(/<t[^>]*>([\s\S]*?)<\/t>/);
          cells.push(is ? decodeXml(is[1]) : "");
        } else {
          const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
          if (v == null) cells.push("");
          else cells.push(t === "s" ? (ss[Number(v)] ?? "") : v);
        }
      }
      const line = cells.join(" | ").replace(/(\s*\|\s*)+$/, "").trim();
      if (line) out += line + "\n";
    }
    if (out.length > 40000) break;
  }
  return out;
}

async function extractRar(buf: Uint8Array, depth = 0): Promise<{ texto: string; aviso?: string }> {
  const { createExtractorFromData } = await import("node-unrar-js");
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const extractor = await createExtractorFromData({ data: ab });
  // extrai só o que sabemos ler de dentro do .rar
  const extracted = extractor.extract({ files: (h) => /\.(pdf|docx|xlsx)$/i.test(h.name) });
  let out = "";
  for (const f of extracted.files) {
    if (out.length > 45000) break;
    if (f.fileHeader.flags.directory || !f.extraction) continue;
    const r = await sniffAndExtract(f.extraction, f.fileHeader.name, depth + 1);
    if (r.texto) out += `\n\n----- ${f.fileHeader.name.split(/[\\/]/).pop()} -----\n` + r.texto;
  }
  return { texto: out, aviso: out ? undefined : "rar sem arquivos legíveis (pdf/docx/xlsx)" };
}

async function sniffAndExtract(buf: Uint8Array, hintName = "", depth = 0): Promise<{ texto: string; aviso?: string }> {
  const ext = (hintName.toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || "";
  const isPdf = buf[0] === 0x25 && buf[1] === 0x50; // %PDF
  const isPk = buf[0] === 0x50 && buf[1] === 0x4b; // zip/ooxml
  const isRar = buf[0] === 0x52 && buf[1] === 0x61 && buf[2] === 0x72 && buf[3] === 0x21; // Rar!
  try {
    if (ext === "pdf" || (isPdf && !ext)) return { texto: await extractPdf(buf) };
    if (ext === "docx") return { texto: await extractDocx(buf) };
    if (ext === "xlsx") return { texto: await extractXlsx(buf) };
    if (ext === "rar" || isRar) return await extractRar(buf, depth);
    if (ext === "doc") return { texto: "", aviso: ".doc (Word 97-2003) não suportado" };
    if (ext === "xls") return { texto: "", aviso: ".xls (Excel 97-2003) não suportado" };
    if (ext === "zip" || isPk) {
      const { unzipSync } = await import("fflate");
      const files = unzipSync(buf);
      if (files["word/document.xml"]) return { texto: await extractDocx(buf) };
      if (files["xl/workbook.xml"]) return { texto: await extractXlsx(buf) };
      if (depth > 1) return { texto: "" };
      let out = "";
      // dentro do zip: prioriza pdf/docx/xlsx
      const entries = Object.entries(files).filter(([n]) => /\.(pdf|docx|xlsx)$/i.test(n));
      for (const [name, data] of entries) {
        if (out.length > 45000) break;
        const r = await sniffAndExtract(data as Uint8Array, name, depth + 1);
        if (r.texto) out += `\n\n----- ${name.split("/").pop()} -----\n` + r.texto;
      }
      return { texto: out, aviso: out ? undefined : "zip sem arquivos legíveis (pdf/docx/xlsx)" };
    }
    if (isPdf) return { texto: await extractPdf(buf) };
    return { texto: "", aviso: "formato de arquivo não suportado" };
  } catch (e) {
    return { texto: "", aviso: "falha ao ler (" + (e as Error).message.slice(0, 50) + ")" };
  }
}

// Editais têm 100k-300k chars; a habilitação/qualificação costuma ficar lá pra
// frente. Em vez de cortar cego no começo, mantém o início + janelas ao redor
// das seções que importam (em ordem do documento), cabendo no orçamento.
function condensar(full: string, budget: number): string {
  if (full.length <= budget) return full;
  const low = full.toLowerCase();
  const HEAD = 12000;
  const WIN = 7000;
  const BACK = 900;
  // menor prioridade = entra primeiro. A habilitação/qualificação é o que mais
  // se pergunta e fica lá pro fim do edital — usa os nomes canônicos das seções
  // (Lei 14.133) pra mirar o conteúdo real, não a menção no sumário. Terceiro
  // número = máx. de ocorrências consideradas por chave.
  const KEYS: [string, number, number][] = [
    ["qualifica[cç][aã]o t[eé]cnica", 1, 2],
    ["qualifica[cç][aã]o econ", 1, 2],
    ["qualifica[cç][aã]o jur", 1, 2],
    ["regularidade fiscal", 1, 2],
    ["habilita[cç][aã]o t[eé]cnica", 1, 2],
    ["documentos?.{0,8}habilita", 1, 2],
    ["julgamento", 2, 2], ["crit[eé]rio", 2, 2], ["proposta", 2, 2],
    ["garantia", 2, 1], ["prazo de entrega", 2, 1], ["prazo de execu", 2, 1],
    ["habilita", 2, 2],
    ["pagamento", 3, 2], ["penalidad", 3, 1], ["san[cç][aã]o", 3, 1],
    ["vig[eê]ncia", 3, 1], ["dota[cç][aã]o", 3, 1], ["valor estimad", 3, 1], ["reajuste", 3, 1],
  ];
  type Rng = { s: number; e: number; p: number };
  const cands: Rng[] = [{ s: 0, e: HEAD, p: 0 }];
  for (const [k, p, max] of KEYS) {
    const re = new RegExp(k, "gi");
    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = re.exec(low)) && count < max) {
      cands.push({ s: Math.max(0, m.index - BACK), e: m.index + WIN, p });
      re.lastIndex = m.index + WIN;
      count++;
    }
  }
  const mergeRanges = (rs: Rng[]): Rng[] => {
    const sorted = [...rs].sort((a, b) => a.s - b.s);
    const mg: Rng[] = [];
    for (const r of sorted) {
      const last = mg[mg.length - 1];
      if (last && r.s <= last.e + 200) last.e = Math.max(last.e, r.e);
      else mg.push({ ...r });
    }
    return mg;
  };
  const covered = (rs: Rng[]) =>
    mergeRanges(rs).reduce((n, r) => n + (Math.min(r.e, full.length) - r.s), 0);
  // adiciona janelas por prioridade, sem estourar o orçamento
  cands.sort((a, b) => a.p - b.p || a.s - b.s);
  const accepted: Rng[] = [];
  for (const c of cands) {
    accepted.push(c);
    if (covered(accepted) > budget) accepted.pop();
  }
  let out = "";
  for (const r of mergeRanges(accepted)) {
    out += (r.s > 0 ? "\n\n[...]\n\n" : "") + full.slice(r.s, Math.min(r.e, full.length));
  }
  return out.slice(0, budget);
}

async function baixar(url: string, timeoutMs = 22000): Promise<{ buf: Uint8Array; cd: string } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal });
    if (!r.ok) return null;
    return { buf: new Uint8Array(await r.arrayBuffer()), cd: String(r.headers.get("content-disposition") || "") };
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
  maxChars = 55000
): Promise<{ texto: string; partes: string[]; avisos: string[] }> {
  if (!cnpj || !ano || !seq) return { texto: "", partes: [], avisos: [] };
  const ctrl = new AbortController();
  const t0 = setTimeout(() => ctrl.abort(), 12000);
  let list: unknown = null;
  try {
    const r = await fetch(`https://pncp.gov.br/pncp-api/v1/orgaos/${cnpj}/compras/${ano}/${seq}/arquivos`, {
      headers: { Accept: "application/json", "User-Agent": UA },
      signal: ctrl.signal,
      cache: "no-store",
    });
    list = r.ok ? await r.json() : null;
  } catch {
    /* ignore */
  } finally {
    clearTimeout(t0);
  }
  const arqs: Record<string, unknown>[] = Array.isArray(list) ? list : [];
  if (!arqs.length) return { texto: "", partes: [], avisos: ["sem arquivos no PNCP"] };

  // ordena: Edital > Termo de Referência > Planilha/Anexo > resto
  const rank = (a: Record<string, unknown>) => {
    const s = `${a.tipoDocumentoNome ?? ""} ${a.titulo ?? ""}`.toLowerCase();
    if (/edital/.test(s)) return 0;
    if (/termo|refer[eê]ncia|projeto b[aá]sico/.test(s)) return 1;
    if (/planilha|pre[cç]o|or[cç]ament|anexo/.test(s)) return 2;
    return 3;
  };
  arqs.sort((a, b) => rank(a) - rank(b));

  let out = "";
  const partes: string[] = [];
  const avisos: string[] = [];
  const RAW_CAP = 300000; // acumula bruto; condensa por seções no fim
  for (const a of arqs.slice(0, 5)) {
    if (out.length >= RAW_CAP) break;
    const doc = a.sequencialDocumento || 1;
    const titulo = String(a.titulo || "documento");
    const dl = await baixar(`https://pncp.gov.br/pncp-api/v1/orgaos/${cnpj}/compras/${ano}/${seq}/arquivos/${doc}`);
    if (!dl) { avisos.push(`${titulo}: não consegui baixar`); continue; }
    const nameHint = (dl.cd.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i) || [])[1] || titulo;
    const { texto, aviso } = await sniffAndExtract(dl.buf, nameHint);
    if (texto) {
      out += `\n\n===== ${titulo} =====\n` + limparRuido(texto).replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      partes.push(titulo);
    } else if (aviso) {
      avisos.push(`${titulo}: ${aviso}`);
    }
  }
  return { texto: condensar(out.trim(), maxChars), partes, avisos };
}
