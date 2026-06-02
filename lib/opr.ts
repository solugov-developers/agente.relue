import { q } from "./db";

export type Num = string | number | null;
export type Row = Record<string, Num>;

export async function getOpr() {
  const safe = async (sql: string): Promise<Row[]> => {
    try {
      return (await q(sql)) as Row[];
    } catch {
      return [];
    }
  };

  const [kpi] = await safe(
    `select count(*) total,
            count(*) filter (where data_encerramento_proposta >= now()) abertas,
            count(distinct orgao_entidade) orgaos,
            count(*) filter (where score_oportunidade >= 80) alto,
            coalesce(sum(valor_total_estimado), 0) valor,
            percentile_cont(0.5) within group (order by valor_total_estimado)
              filter (where valor_total_estimado is not null) mediana_geral
     from public.licitacoes_ti where e_ti`
  );

  const marcas = await safe(
    `select marca, count(*) n from public.v_marcas group by 1 order by 2 desc limit 12`
  );
  const ticket = await safe(
    `select subcategoria, count(*) total, count(valor_total_estimado) nv,
            percentile_cont(0.5) within group (order by valor_total_estimado) mediana
     from public.licitacoes_ti where e_ti group by 1 order by total desc`
  );
  const orgaos = await safe(
    `select orgao_entidade, count(*) n from public.licitacoes_ti where e_ti group by 1 order by 2 desc limit 10`
  );
  const ufs = await safe(
    `select uf, count(*) n from public.licitacoes_ti where e_ti and uf is not null group by 1`
  );
  const modalidades = await safe(
    `select modalidade_nome, count(*) n from public.licitacoes_ti where e_ti and modalidade_nome is not null group by 1 order by 2 desc`
  );
  const oportunidades = await safe(
    `select pncp_id, orgao_entidade, uf, subcategoria, valor_total_estimado,
            data_encerramento_proposta, score_oportunidade, resumo, link
     from public.licitacoes_ti
     where e_ti and data_encerramento_proposta >= now()
     order by score_oportunidade desc nulls last, valor_total_estimado desc nulls last
     limit 10`
  );
  const tendencia = await safe(
    `select to_char(date_trunc('month', data_publicacao_pncp), 'YYYY-MM') mes, count(*) n,
            coalesce(sum(valor_total_estimado),0) valor
     from public.licitacoes_ti
     where e_ti and data_publicacao_pncp >= (now() - interval '12 months')
     group by 1 order by 1`
  );
  const segMes = await safe(
    `select subcategoria, to_char(date_trunc('month', data_publicacao_pncp), 'YYYY-MM') mes, count(*) n
     from public.licitacoes_ti
     where e_ti and data_publicacao_pncp >= (now() - interval '12 months')
     group by 1, 2 order by 2`
  );

  return { kpi, marcas, ticket, orgaos, ufs, modalidades, oportunidades, tendencia, segMes };
}
