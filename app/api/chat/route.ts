import { NextRequest, NextResponse } from "next/server";
import { readonlyQuery } from "@/lib/db";
import { azureChat } from "@/lib/azure";

export const runtime = "nodejs";
export const maxDuration = 60;

const SCHEMA = `
public.licitacoes_ti(pncp_id text, orgao_entidade text, unidade_orgao text, cnpj_orgao text, uf text,
municipio text, modalidade_nome text, objeto_compra text, valor_total_estimado numeric, valor_total_homologado numeric,
situacao_compra_nome text, ano_compra int, data_publicacao_pncp timestamptz, data_abertura_proposta timestamptz,
data_encerramento_proposta timestamptz, link text, e_ti boolean, subcategoria text, marcas jsonb, resumo text,
score_oportunidade int, valor_oficial boolean)
public.licitacoes_itens(pncp_id text, numero_item int, descricao text, quantidade numeric, unidade_medida text,
valor_unitario_estimado numeric, valor_total numeric)
public.v_marcas(pncp_id, uf, subcategoria, orgao_entidade, modalidade_nome, valor_total_estimado, marca)
  -- view: 1 linha por marca por licitacao, nomes JA padronizados (caixa/acento unificados)
subcategoria: ERP/Gestão | Licenças/Software de prateleira | Cloud/Infraestrutura | Suporte/Manutenção de TI |
Segurança da Informação | Desenvolvimento de Software | BI/Dados/IA | Telecom/Redes | Outro`;

const SYS_SQL = `Voce gera UMA query Postgres (SELECT, somente leitura) para responder a pergunta sobre licitacoes de TI publicas (PNCP).
REGRAS:
- Sempre filtre e_ti = true.
- Para marcas/fabricantes use a VIEW public.v_marcas (ja padroniza caixa/acento). Ex: SELECT marca, count(*) n FROM public.v_marcas GROUP BY 1 ORDER BY 2 DESC.
- 'Abertas' = data_encerramento_proposta >= now().
- Para ticket/valor use percentile_cont(0.5) (mediana) alem de avg, com COUNT(valor_total_estimado) (cobertura parcial). Sempre valor_total_estimado IS NOT NULL.
- Limite listas longas (LIMIT 20-50). Para agregacoes (por UF/orgao/subcategoria) retorne todos os grupos.
- NUNCA INSERT/UPDATE/DELETE/DROP/ALTER. So leitura.
Esquema:${SCHEMA}
Responda APENAS com a SQL, sem markdown, sem explicacao.`;

const SYS_ANSWER = `Voce e o analista de inteligencia de licitacoes de TI da Solugov. Responda em portugues, claro e direto,
baseado SOMENTE nos dados fornecidos (nao invente). Use TABELA markdown para listas/rankings e mostre TODOS os grupos retornados.
Valores em R$. Em ticket/valor, destaque a MEDIANA (a media e distorcida por contratos gigantes) e cite o n (cobertura).
Se o resultado vier vazio, diga isso de forma util.`;

function sanitize(sql: string): string {
  return sql.replace(/```sql/gi, "").replace(/```/g, "").trim().replace(/;\s*$/, "");
}
function isReadOnly(sql: string): boolean {
  const s = sql.toLowerCase();
  if (!/^\s*(with|select)\b/.test(s)) return false;
  if (/;\s*\S/.test(sql)) return false; // multiplos statements
  return !/\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|merge)\b/.test(s);
}

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string")
      return NextResponse.json({ error: "Pergunta inválida" }, { status: 400 });

    // 1) gera SQL
    let sql = sanitize(
      await azureChat(
        [
          { role: "system", content: SYS_SQL },
          { role: "user", content: question },
        ],
        { maxTokens: 1500 }
      )
    );

    if (!isReadOnly(sql))
      return NextResponse.json({
        answer: "Só consigo responder com consultas de leitura. Reformule a pergunta. 🙂",
        sql,
      });

    // 2) executa (read-only)
    let rows: Record<string, unknown>[] = [];
    try {
      rows = await readonlyQuery(sql);
    } catch (e) {
      // tenta corrigir 1x
      const fix = sanitize(
        await azureChat(
          [
            { role: "system", content: SYS_SQL },
            { role: "user", content: question },
            { role: "assistant", content: sql },
            { role: "user", content: `A query deu erro: ${(e as Error).message}. Corrija e responda só com a SQL.` },
          ],
          { maxTokens: 1500 }
        )
      );
      if (isReadOnly(fix)) {
        sql = fix;
        rows = await readonlyQuery(sql);
      } else throw e;
    }

    // 3) resume
    const answer = await azureChat([
      { role: "system", content: SYS_ANSWER },
      {
        role: "user",
        content: `Pergunta: ${question}\nResultado (JSON, ${rows.length} linhas):\n${JSON.stringify(
          rows
        ).slice(0, 14000)}`,
      },
    ]);

    return NextResponse.json({ answer, sql, rowCount: rows.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
