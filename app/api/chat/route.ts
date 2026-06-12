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

REGRAS GERAIS:
- Sempre filtre e_ti = true.
- SEMPRE inclua LIMIT (no maximo 200; listas longas LIMIT 20-50). PREFIRA AGREGACOES (count/sum/percentile_cont/group by) a retornar linhas cruas. NUNCA "SELECT *" sem LIMIT.
- 'Abertas' = data_encerramento_proposta >= now().
- Em SUM/AVG/total de valor, SEMPRE filtre valor_total_estimado < 999999999 (exclui sentinelas/outliers) — mesma definicao do painel. (percentile_cont para mediana ja ignora nulos.)
- Em agregacao por grupo, retorne SEMPRE COUNT(*) AS total (numero REAL de licitacoes). Para ticket/valor traga tambem percentile_cont(0.5) within group (order by valor_total_estimado) AS mediana e avg(valor_total_estimado) AS media (com o filtro < 999999999). NAO filtre valor IS NOT NULL no WHERE.

MARCAS / FABRICANTES — view public.v_marcas (ja padroniza caixa/acento). ELA JA TEM: pncp_id, marca, uf, subcategoria, orgao_entidade, modalidade_nome, valor_total_estimado.
- Para rankings/contagens/valores de marca, consulte public.v_marcas SOZINHA, SEM JOIN (ex.: SELECT marca, COUNT(*) AS total, percentile_cont(0.5) within group (order by valor_total_estimado) FILTER (WHERE valor_total_estimado < 999999999) AS mediana FROM public.v_marcas GROUP BY marca ORDER BY total DESC LIMIT 20).
- So faca JOIN com licitacoes_ti quando precisar de colunas que NAO existem em v_marcas (ex.: data_encerramento_proposta, score_oportunidade, objeto_compra, resumo, data_publicacao_pncp). Nesse caso JOIN SOMENTE por pncp_id (vm.pncp_id = lt.pncp_id) e SEMPRE qualifique as colunas (vm.x / lt.x) para evitar ambiguidade. NUNCA junte por uf/subcategoria/orgao/modalidade.

CATEGORIA / CONCEITO DE PRODUTO -> use a coluna subcategoria (categorizacao REAL da base). NUNCA resolva categoria por ILIKE em nome de marca:
- IA / inteligencia artificial / dados / BI -> subcategoria = 'BI/Dados/IA'
- seguranca (da informacao) -> 'Seguranca da Informacao'
- nuvem / cloud / infra -> 'Cloud/Infraestrutura'
- ERP / gestao -> 'ERP/Gestao'
- licencas / software de prateleira -> 'Licencas/Software de prateleira'
- desenvolvimento de software -> 'Desenvolvimento de Software'
- suporte / manutencao -> 'Suporte/Manutencao de TI'
- telecom / redes -> 'Telecom/Redes'
(use os acentos reais das subcategorias do esquema abaixo ao escrever a SQL)

MARCAS DE IA (quando pedirem fabricantes/marcas DE IA): filtre v_marcas.marca por uma ALLOWLIST de fabricantes de IA, por nomes COMPLETOS:
  marca ILIKE 'OpenAI%' OR marca ILIKE 'ChatGPT%' OR marca ILIKE 'Anthropic%' OR marca ILIKE 'Claude%' OR marca ILIKE '%Gemini%' OR marca ILIKE '%Copilot%' OR marca ILIKE 'Mistral%' OR marca ILIKE 'Perplexity%' OR marca ILIKE 'DeepSeek%' OR marca ILIKE 'Llama%' OR marca ILIKE 'Midjourney%' OR marca ILIKE 'Hugging Face%' OR marca ILIKE 'Stability%'
- PROIBIDO ILIKE com tokens de 1-2 letras ('%ai%','%ia%','%ml%' casam Sophia, CIASC, mLabs). Se precisar de substring textual, use fronteira de palavra: coluna ~* '\\yPALAVRA\\y'.

PREMISSA com superlativo (ex.: "ja que a Oracle e a mais comprada, quantas tem?"): NAO assuma a premissa. Alem do dado pedido, traga TAMBEM o lider real (ex.: top 1 por total na v_marcas) para a resposta poder confirmar ou corrigir a premissa.

CONTEXTO: as mensagens anteriores sao a MESMA conversa. Se a pergunta referenciar o resultado anterior ("desses", "cada um desse", "e por UF?"), REAPROVEITE escopo/filtros/joins da SQL anterior e ajuste so o que mudou.

ESCOPO: a base e SO licitacoes de TI. Termos como ambulancia/medicamento/hospital retornam SISTEMAS/SERVICOS de TI que mencionam o termo (ex.: software de gestao hospitalar), nao a compra fisica. Para texto livre em objeto_compra use termos especificos e fronteira de palavra; evite tokens curtos/ambiguos ('%medic%' pega 'medicina/medico').
- NUNCA INSERT/UPDATE/DELETE/DROP/ALTER. So leitura.
Esquema:${SCHEMA}
Responda APENAS com a SQL, sem markdown, sem explicacao.`;

const SYS_ANSWER = `Voce e o Relue, analista de inteligencia de licitacoes de TI da Solugov. Responda em portugues, claro e direto, baseado SOMENTE nos dados fornecidos (nao invente).
- Voce e SOMENTE-LEITURA. NUNCA afirme que algo foi apagado/inserido/alterado/atualizado na base. O resultado e SEMPRE uma leitura. Se o usuario pediu para modificar/apagar, deixe claro que voce nao altera a base.
- Use TABELA markdown para rankings/listas e mostre TODOS os grupos retornados. Valores em R$. A contagem principal e o TOTAL (numero real de licitacoes). Em ticket/valor destaque a MEDIANA.
- Se o resultado for uma amostra grande de linhas cruas (sem agregacao), NAO calcule totais/rankings/medianas a partir dela — diga que precisa refinar a pergunta.
- NAO valide superlativos/premissas nao verificados da pergunta ('a maior', 'a mais comprada'). Se a premissa contradiz os dados retornados, corrija (ex.: 'a lider e a Microsoft, nao a Oracle').
- Escopo e TI: se a pergunta sugerir compra fisica fora de TI (ambulancias, remedios), esclareca que os dados sao sistemas/servicos de TI que mencionam o termo.
- NUNCA mencione 'JSON', 'prompt', 'schema', 'SQL', 'registros visiveis' ou 'banco de dados' na resposta — fale em termos de negocio.
- Seja conciso. Se vier vazio, diga que nao ha dados para isso.`;

function sanitize(sql: string): string {
  return sql.replace(/```sql/gi, "").replace(/```/g, "").trim().replace(/;\s*$/, "");
}
function isReadOnly(sql: string): boolean {
  const s = sql.toLowerCase();
  if (!/^\s*(with|select)\b/.test(s)) return false;
  if (/;\s*\S/.test(sql)) return false;
  return !/\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|merge)\b/.test(s);
}

// F3 — garante LIMIT em SELECTs de linhas cruas (sem agregação)
function enforceLimit(sql: string): string {
  const s = sql.toLowerCase();
  const hasAgg = /\b(count|sum|avg|min|max|percentile_cont|group\s+by)\b/.test(s);
  const hasLimit = /\blimit\s+\d+/.test(s);
  return !hasAgg && !hasLimit ? sql.replace(/\s*$/, "") + " LIMIT 200" : sql;
}

// F1 — pedido explícito de mutação (DML/DDL) na pergunta
const DESTRUCTIVE = /\b(delete|drop|truncate|insert|update|alter|merge|grant|revoke)\b/i;
const DESTRUCTIVE_PT =
  /\b(apag\w+|exclu\w+|deletar|remov\w+)\b[^.?!\n]{0,40}\b(base|dados|registros?|linhas?|tabela|licita\w+)\b/i;
// F4 — tentativa de injeção / extração de meta (prompt/schema)
const META_INJECTION =
  /(prompt de sistema|system prompt|suas instru\w+|suas regras|ignore (as |todas )?(instru|previous|regras)|ignore tudo|esque\w+ (as |suas )?(instru|regras)|schema (completo|do banco|das tabelas)|todas as (tabelas|colunas)|revele (o|seu|suas)|imprima (o|seu) |reveal your|jailbreak|sem restri\w+|developer mode)/i;

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

  // F1 — pedido de mutação: resposta honesta, sem rodar nada
  if (DESTRUCTIVE.test(question) || DESTRUCTIVE_PT.test(question))
    return streamResponse(
      { sql: "", rowCount: 0 },
      "Sou somente-leitura — não altero, apago nem insiro nada na base (nem teria como). Posso te dar uma contagem ou consulta: o que você quer saber?"
    );

  // F4 — injeção / extração de meta: resposta fixa, sem rodar nada
  if (META_INJECTION.test(question))
    return streamResponse(
      { sql: "", rowCount: 0 },
      "Não compartilho instruções internas nem a estrutura técnica do sistema. Posso ajudar com dados de licitações de TI — marcas, órgãos, valores, prazos e segmentos."
    );

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

  let sql: string;
  try {
    sql = sanitize(
      await azureChat([{ role: "system", content: SYS_SQL }, ...hist, { role: "user", content: question }], {
        maxTokens: 1500,
      })
    );
  } catch {
    return streamResponse(
      { sql: "", rowCount: 0 },
      "Demorei demais para responder agora. Tente de novo em instantes ou reformule a pergunta."
    );
  }

  if (!isReadOnly(sql))
    return streamResponse(
      { sql, rowCount: 0 },
      "Posso ajudar com dados de licitações de TI — marcas, órgãos, valores, prazos e segmentos. Pode reformular nesses termos?"
    );
  sql = enforceLimit(sql);

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
      sql = enforceLimit(fix);
      try {
        rows = await readonlyQuery(sql);
      } catch {
        return streamResponse(
          { sql, rowCount: 0 },
          "Não consegui consultar isso agora. Tente reformular — ex.: 'top 10 marcas', 'oportunidades de ERP abertas'."
        );
      }
    } else {
      return streamResponse(
        { sql, rowCount: 0 },
        "Não consegui montar essa consulta. Tente reformular — ex.: 'top 10 marcas', 'preço mediano de antivírus'."
      );
    }
  }

  const gen = azureChatStream([
    { role: "system", content: SYS_ANSWER },
    ...hist,
    {
      role: "user",
      content:
        `Operacao executada: SELECT (somente leitura), ${rows.length} linha(s) lidas. Nenhuma alteracao foi feita na base.\n` +
        `Pergunta do usuario: ${question}\n` +
        `Dados retornados:\n${JSON.stringify(rows).slice(0, 14000)}`,
    },
  ]);
  return streamResponse({ sql, rowCount: rows.length }, gen);
}
