import { NextRequest } from "next/server";
import { readonlyQuery } from "@/lib/db";
import { azureChat, azureChatStream } from "@/lib/azure";

export const runtime = "nodejs";
export const maxDuration = 60;

const SCHEMA = `
public.licitacoes_ti(pncp_id text, orgao_entidade text, unidade_orgao text, cnpj_orgao text, uf text,
municipio text, modalidade_nome text, objeto_compra text, valor_total_estimado numeric, valor_total_homologado numeric,
situacao_compra_nome text, ano_compra int, data_publicacao_pncp timestamptz, data_abertura_proposta timestamptz,
data_encerramento_proposta timestamptz, link text, e_ti boolean, subcategoria text, marcas jsonb, resumo text,
score_oportunidade int, valor_oficial boolean)
public.v_marcas(pncp_id, uf, subcategoria, orgao_entidade, modalidade_nome, valor_total_estimado, marca)
  -- view: 1 linha por marca por licitacao, nomes JA padronizados (caixa/acento unificados)
public.licitacoes_itens(pncp_id, numero_item int, descricao text, quantidade numeric, unidade_medida text,
  valor_unitario_estimado numeric, valor_total numeric) -- itens de cada licitacao; join por pncp_id. Para benchmark de
  PRECO unitario de um produto: filtre descricao ilike '%termo%' e valor_unitario_estimado>0, use percentile_cont(0.5).
subcategoria: ERP/Gestão | Licenças/Software de prateleira | Cloud/Infraestrutura | Suporte/Manutenção de TI |
Segurança da Informação | Desenvolvimento de Software | BI/Dados/IA | Telecom/Redes | Outro`;

const SYS_SQL = `Voce gera UMA query Postgres (SELECT, somente leitura) para responder a pergunta sobre licitacoes de TI publicas (PNCP).
REGRAS:
- Sempre filtre e_ti = true.
- Para marcas/fabricantes use a VIEW public.v_marcas (ja padroniza caixa/acento).
- 'Abertas' = data_encerramento_proposta >= now().
- Em QUALQUER agregacao por grupo, retorne SEMPRE COUNT(*) AS total (numero REAL de licitacoes do grupo).
- Para ticket/valor: alem de total, traga COUNT(valor_total_estimado) AS n_com_valor (cobertura ~95%),
  percentile_cont(0.5) within group (order by valor_total_estimado) AS mediana e avg(valor_total_estimado) AS media.
  NAO filtre valor_total_estimado IS NOT NULL no WHERE (senao o total fica errado) — os agregados de valor ja ignoram nulos.
- Agregacoes (por UF/orgao/subcategoria): retorne todos os grupos. Listas longas: LIMIT 20-50.
- CONTEXTO: as mensagens anteriores sao a MESMA conversa. Se a pergunta atual referenciar o resultado anterior
  (ex.: "desses", "cada um desse", "e por UF?", "o ticket de cada"), REAPROVEITE o escopo/filtros/joins da SQL anterior
  (que esta no historico) e apenas ajuste o que mudou. Ex.: se antes listou softwares (marcas) por inexigibilidade,
  "ticket medio de cada um desse" = mediana/media de valor POR MARCA com o MESMO filtro de inexigibilidade (join v_marcas + licitacoes_ti).
- NUNCA INSERT/UPDATE/DELETE/DROP/ALTER. So leitura.
Esquema:${SCHEMA}
Responda APENAS com a SQL, sem markdown, sem explicacao.`;

const SYS_ANSWER = `Voce e o Relue, analista de inteligencia de licitacoes de TI da Solugov. Responda em portugues, claro e direto,
baseado SOMENTE nos dados fornecidos (nao invente). Use TABELA markdown para rankings/listas e mostre TODOS os grupos retornados.
Valores em R$. A coluna de contagem principal e o TOTAL (numero real de licitacoes); use-a como referencia.
Em ticket/valor, destaque a MEDIANA; só mencione "n com valor" se houver diferenca relevante entre total e cobertura
(ex.: "mediana sobre N de M com valor informado"). Nao confunda cobertura com o total. Seja conciso. Se vier vazio, diga isso.`;

function sanitize(sql: string): string {
  return sql.replace(/```sql/gi, "").replace(/```/g, "").trim().replace(/;\s*$/, "");
}
function isReadOnly(sql: string): boolean {
  const s = sql.toLowerCase();
  if (!/^\s*(with|select)\b/.test(s)) return false;
  if (/;\s*\S/.test(sql)) return false;
  return !/\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|merge)\b/.test(s);
}

function streamResponse(meta: { sql: string; rowCount: number }, gen: AsyncGenerator<string> | string) {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(enc.encode(JSON.stringify(meta) + "\n"));
      try {
        if (typeof gen === "string") controller.enqueue(enc.encode(gen));
        else for await (const d of gen) controller.enqueue(enc.encode(d));
      } catch (e) {
        controller.enqueue(enc.encode("\n\n_(erro ao gerar resposta: " + (e as Error).message + ")_"));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

type Hist = { role: "user" | "assistant"; content: string; sql?: string };

export async function POST(req: NextRequest) {
  const body = await req.json();
  const question = body?.question;
  if (!question || typeof question !== "string")
    return streamResponse({ sql: "", rowCount: 0 }, "Pergunta inválida.");

  // memória de conversa: últimas trocas (com a SQL anterior, p/ resolver "desses", "cada um", etc.)
  const hist: { role: "user" | "assistant"; content: string }[] = (
    Array.isArray(body?.history) ? (body.history as Hist[]) : []
  )
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .slice(-6)
    .map((m) =>
      m.role === "assistant"
        ? {
            role: "assistant" as const,
            content: ((m.sql ? `[SQL usada]\n${m.sql}\n` : "") + `[Resposta]\n${m.content}`).slice(0, 1300),
          }
        : { role: "user" as const, content: String(m.content).slice(0, 700) }
    );

  let sql = sanitize(
    await azureChat([{ role: "system", content: SYS_SQL }, ...hist, { role: "user", content: question }], {
      maxTokens: 1500,
    })
  );

  if (!isReadOnly(sql))
    return streamResponse(
      { sql, rowCount: 0 },
      "Só consigo responder com consultas de leitura. Reformule a pergunta."
    );

  let rows: Record<string, unknown>[] = [];
  try {
    rows = await readonlyQuery(sql);
  } catch (e) {
    const fix = sanitize(
      await azureChat(
        [
          { role: "system", content: SYS_SQL },
          ...hist,
          { role: "user", content: question },
          { role: "assistant", content: sql },
          {
            role: "user",
            content: `A query deu erro: ${(e as Error).message}. Corrija e responda só com a SQL.`,
          },
        ],
        { maxTokens: 1500 }
      )
    );
    if (isReadOnly(fix)) {
      sql = fix;
      try {
        rows = await readonlyQuery(sql);
      } catch (e2) {
        return streamResponse({ sql, rowCount: 0 }, "Não consegui consultar a base: " + (e2 as Error).message);
      }
    } else {
      return streamResponse({ sql, rowCount: 0 }, "Não consegui montar a consulta. Reformule a pergunta.");
    }
  }

  const gen = azureChatStream([
    { role: "system", content: SYS_ANSWER },
    ...hist,
    {
      role: "user",
      content: `Pergunta: ${question}\nResultado (JSON, ${rows.length} linhas):\n${JSON.stringify(rows).slice(0, 14000)}`,
    },
  ]);
  return streamResponse({ sql, rowCount: rows.length }, gen);
}
