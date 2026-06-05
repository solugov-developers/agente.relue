import { NextRequest } from "next/server";
import { getEdital } from "@/lib/edital";
import { azureChatStream } from "@/lib/azure";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYS = `Voce e o Relue, analista de licitacoes de TI da Solugov. Responda em portugues, claro e objetivo,
SOMENTE com base nos dados do edital fornecido (NAO invente). Pode resumir o objeto, destacar/agrupar itens,
comentar valor, prazos, modalidade e possiveis riscos/oportunidades comerciais. Use markdown (listas/tabela) quando ajudar.
Se a informacao nao constar no contexto, diga que nao consta no edital.`;

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

  const ctx = `EDITAL ${pncpId}
Órgão: ${l.orgao_entidade} (${l.municipio ?? ""}/${l.uf ?? ""})
Modalidade: ${l.modalidade_nome ?? "—"} | Situação: ${l.situacao_compra_nome ?? "—"}
Segmento (classificação Relue): ${l.subcategoria ?? "—"} | Score de oportunidade: ${l.score_oportunidade ?? "—"}
Objeto: ${l.objeto_compra ?? l.resumo ?? ""}
Valor total estimado: R$ ${l.valor_total_estimado ?? "—"}
Publicação: ${l.data_publicacao_pncp ?? "—"} | Encerramento de propostas: ${l.data_encerramento_proposta ?? "—"}
Marcas/fabricantes citados: ${d.marcas.join(", ") || "—"}
ITENS (${d.itens.length} no total):
${itensTxt}`;

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
