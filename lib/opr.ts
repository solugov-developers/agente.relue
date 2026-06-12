import { q } from "./db";

export type Num = string | number | null;
export type Row = Record<string, Num>;

export async function getOpr(months = 12) {
  const m = [6, 12, 18].includes(months) ? months : 12;
  const safe = (sql: string): Promise<Row[]> => (q(sql) as Promise<Row[]>).catch(() => [] as Row[]);

  // todas as consultas em PARALELO (antes eram sequenciais -> navegação lenta)
  const [
    kpiArr,
    marcas,
    ticket,
    ufs,
    modalidades,
    tendencia,
    segMes,
    valorSeg,
    janelaArr,
    faixas,
    esfera,
    orgaosValor,
  ] = await Promise.all([
    safe(
      `select count(*) total,
              count(*) filter (where data_encerramento_proposta >= now()) abertas,
              count(distinct orgao_entidade) orgaos,
              count(*) filter (where score_oportunidade >= 80) alto,
              coalesce(sum(valor_total_estimado) filter (where valor_total_estimado < 999999999), 0) valor,
              percentile_cont(0.5) within group (order by valor_total_estimado)
                filter (where valor_total_estimado is not null and valor_total_estimado < 999999999) mediana_geral
       from public.licitacoes_ti where e_ti`
    ),
    safe(`select marca, count(*) n from public.mv_marcas group by 1 order by 2 desc limit 12`),
    safe(
      `select subcategoria, count(*) total, count(valor_total_estimado) nv,
              percentile_cont(0.5) within group (order by valor_total_estimado) mediana
       from public.licitacoes_ti where e_ti group by 1 order by total desc`
    ),
    safe(`select uf, count(*) n from public.licitacoes_ti where e_ti and uf is not null group by 1`),
    safe(
      `select modalidade_nome, count(*) n from public.licitacoes_ti where e_ti and modalidade_nome is not null group by 1 order by 2 desc`
    ),
    safe(
      `select to_char(date_trunc('month', data_publicacao_pncp), 'YYYY-MM') mes, count(*) n,
              coalesce(sum(valor_total_estimado) filter (where valor_total_estimado < 999999999),0) valor
       from public.licitacoes_ti
       where e_ti and data_publicacao_pncp >= (now() - interval '${m} months')
       group by 1 order by 1`
    ),
    safe(
      `select subcategoria, to_char(date_trunc('month', data_publicacao_pncp), 'YYYY-MM') mes, count(*) n
       from public.licitacoes_ti
       where e_ti and data_publicacao_pncp >= (now() - interval '${m} months')
       group by 1, 2 order by 2`
    ),
    // onde está o dinheiro — valor em jogo por segmento
    safe(
      `select subcategoria, coalesce(sum(valor_total_estimado) filter (where valor_total_estimado < 999999999),0) v, count(*) n
       from public.licitacoes_ti where e_ti group by 1 order by 2 desc nulls last`
    ),
    // janela comercial — prazos abrindo
    safe(
      `select count(*) filter (where data_encerramento_proposta between now() and now() + interval '7 days') d7,
              count(*) filter (where data_encerramento_proposta between now() and now() + interval '15 days') d15,
              count(*) filter (where data_encerramento_proposta between now() and now() + interval '30 days') d30,
              count(*) filter (where data_encerramento_proposta >= now()) abertas
       from public.licitacoes_ti where e_ti`
    ),
    // faixas de valor
    safe(
      `select case when valor_total_estimado < 50000 then 1
                   when valor_total_estimado < 200000 then 2
                   when valor_total_estimado < 1000000 then 3
                   else 4 end faixa,
              count(*) n
       from public.licitacoes_ti where e_ti and valor_total_estimado is not null group by 1 order by 1`
    ),
    // esfera administrativa
    safe(`select esfera_id, count(*) n from public.licitacoes_ti where e_ti group by 1 order by 2 desc`),
    // contas-alvo por valor
    safe(
      `select orgao_entidade, coalesce(sum(valor_total_estimado) filter (where valor_total_estimado < 999999999),0) v, count(*) n
       from public.licitacoes_ti where e_ti group by 1 order by 2 desc nulls last limit 8`
    ),
  ]);

  return {
    kpi: kpiArr[0],
    marcas,
    ticket,
    ufs,
    modalidades,
    tendencia,
    segMes,
    valorSeg,
    janela: janelaArr[0],
    faixas,
    esfera,
    orgaosValor,
  };
}
