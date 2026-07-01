import { NextRequest } from "next/server";
import { getEdital } from "@/lib/edital";
import { fetchEditalTexto } from "@/lib/editalDoc";
import { azureChatStream } from "@/lib/azure";

export const runtime = "nodejs";
export const maxDuration = 60;
// baixar o PDF do PNCP exige IP BR (PNCP recusa nuvem dos EUA)
export const preferredRegion = "gru1";

const SYS = `Voce e o Relue, analista de licitacoes de TI da Solugov. Responda em portugues, claro e objetivo,
SOMENTE com base nos dados e no TEXTO DO EDITAL fornecidos (NAO invente). Quando houver "TEXTO DO ARQUIVO DO EDITAL",
use-o como fonte principal (ele e o conteudo real do PDF): resuma o objeto, extraia requisitos/habilitacao/prazos/
criterios de julgamento, valor, e aponte riscos e oportunidades comerciais. Use markdown (listas/tabela) quando ajudar.
Se a informacao nao constar no que foi fornecido, diga que nao consta.`;

export async function POST(req: NextRequest) {
  const enc = new TextEncoder();
  const txt = (s: string) =>
    new Response(enc.encode(s), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

  const { pncpId, question } = await req.json();
  if (!pncpId || !question || typeof question !== "string") return txt("Pergunta inválida.");

  const d = await getEdital(String(pncpId));
  if (!d) return txt("Edital não encontrado.");

  const l = d.lic as Record<string, unknown>;
  const itensTxt = d.itens
    .slice(0, 90)
    .map(
      (it) =>
        `#${it.numero_item} ${it.descricao ?? ""} | qtd ${it.quantidade ?? "—"} ${it.unidade_medida ?? ""} | unit R$ ${it.valor_unitario_estimado ?? "—"} | total R$ ${it.valor_total ?? "—"}`
    )
    .join("\n");

  // baixa e extrai o texto dos arquivos do edital (PDF/Word/Excel/ZIP)
  const doc = await fetchEditalTexto(String(l.cnpj_orgao ?? ""), String(l.ano_compra ?? ""), String(l.sequencial_compra ?? ""));
  const docBloco = doc.texto
    ? `\n\nCONTEÚDO DOS ARQUIVOS DO EDITAL (extraído de: ${doc.partes.join("; ")}):\n${doc.texto}`
    : `\n\n(Não consegui ler os arquivos${doc.avisos.length ? ": " + doc.avisos.join("; ") : ""} — responda com base nos dados acima.)`;

  const ctx = `EDITAL ${pncpId}
Órgão: ${l.orgao_entidade} (${l.municipio ?? ""}/${l.uf ?? ""})
Modalidade: ${l.modalidade_nome ?? "—"} | Situação: ${l.situacao_compra_nome ?? "—"}
Segmento (classificação Relue): ${l.subcategoria ?? "—"} | Score de oportunidade: ${l.score_oportunidade ?? "—"}
Objeto: ${l.objeto_compra ?? l.resumo ?? ""}
Valor total estimado: R$ ${l.valor_total_estimado ?? "—"}
Publicação: ${l.data_publicacao_pncp ?? "—"} | Encerramento de propostas: ${l.data_encerramento_proposta ?? "—"}
Marcas/fabricantes citados: ${d.marcas.join(", ") || "—"}
ITENS (${d.itens.length} no total):
${itensTxt}${docBloco}`;

  const gen = azureChatStream([
    { role: "system", content: SYS },
    { role: "user", content: `${ctx}\n\nPergunta do usuário: ${question}` },
  ]);

  const stream = new ReadableStream({
    async start(c) {
      try {
        for await (const t of gen) c.enqueue(enc.encode(t));
      } catch (e) {
        c.enqueue(enc.encode("\n\n_(erro ao gerar resposta: " + (e as Error).message + ")_"));
      }
      c.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
