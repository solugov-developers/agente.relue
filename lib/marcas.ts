import { q } from "./db";
import type { LicRow } from "./licitacoes";

export type MarcaRow = {
  marca: string;
  n: string;
  valor: string;
  abertas: string;
  total?: string;
  preco_mediano?: string | null;
};

export async function listMarcas(search?: string): Promise<MarcaRow[]> {
  const params: unknown[] = [];
  let where = "";
  if (search && search.trim()) {
    params.push("%" + search.trim() + "%");
    where = `where m.marca ilike $1`;
  }
  return q<MarcaRow>(
    `select m.marca,
            count(distinct m.pncp_id) n,
            coalesce(sum(l.valor_total_estimado) filter (where l.valor_total_estimado < 999999999), 0) valor,
            count(*) filter (where l.data_encerramento_proposta >= now()) abertas,
            count(*) over() total
     from public.v_marcas m
     join public.licitacoes_ti l on l.pncp_id = m.pncp_id
     ${where}
     group by 1
     having count(distinct m.pncp_id) >= 2
     order by n desc
     limit 2000`,
    params
  );
}

export async function getMarca(marca: string) {
  const p = [marca];
  const editalCols = `l.pncp_id, l.orgao_entidade, l.unidade_orgao, l.uf, l.municipio, l.subcategoria,
     l.modalidade_nome, l.valor_total_estimado, l.data_encerramento_proposta, l.data_publicacao_pncp,
     l.score_oportunidade, l.situacao_compra_nome, l.resumo, l.objeto_compra, l.link,
     (l.data_encerramento_proposta >= now()) aberta`;

  const [kpiArr, orgaos, ufs, modal, tend, segmentos, precoArr, editais] = await Promise.all([
    q(`select count(distinct m.pncp_id) n,
              coalesce(sum(l.valor_total_estimado) filter (where l.valor_total_estimado < 999999999),0) valor,
              count(*) filter (where l.data_encerramento_proposta>=now()) abertas,
              percentile_cont(0.5) within group (order by l.valor_total_estimado)
                filter (where l.valor_total_estimado is not null) mediana
       from public.v_marcas m join public.licitacoes_ti l on l.pncp_id=m.pncp_id where m.marca=$1`, p),
    q(`select l.orgao_entidade label, count(distinct m.pncp_id) n, coalesce(sum(l.valor_total_estimado) filter (where l.valor_total_estimado < 999999999),0) v
       from public.v_marcas m join public.licitacoes_ti l on l.pncp_id=m.pncp_id where m.marca=$1
       group by 1 order by 2 desc limit 8`, p),
    q(`select l.uf, count(distinct m.pncp_id) n
       from public.v_marcas m join public.licitacoes_ti l on l.pncp_id=m.pncp_id
       where m.marca=$1 and l.uf is not null group by 1`, p),
    q(`select l.modalidade_nome name, count(distinct m.pncp_id) value
       from public.v_marcas m join public.licitacoes_ti l on l.pncp_id=m.pncp_id
       where m.marca=$1 and l.modalidade_nome is not null group by 1 order by 2 desc`, p),
    q(`select to_char(date_trunc('month', l.data_publicacao_pncp), 'YYYY-MM') mes, count(distinct m.pncp_id) n,
              coalesce(sum(l.valor_total_estimado) filter (where l.valor_total_estimado < 999999999),0) valor
       from public.v_marcas m join public.licitacoes_ti l on l.pncp_id=m.pncp_id
       where m.marca=$1 and l.data_publicacao_pncp >= (now() - interval '12 months')
       group by 1 order by 1`, p),
    q(`select l.subcategoria, count(distinct m.pncp_id) n
       from public.v_marcas m join public.licitacoes_ti l on l.pncp_id=m.pncp_id
       where m.marca=$1 and l.subcategoria is not null group by 1 order by 2 desc`, p),
    q(`select percentile_cont(0.5) within group (order by i.valor_unitario_estimado) mediana,
              count(*) n
       from public.licitacoes_itens i join public.v_marcas m on m.pncp_id=i.pncp_id
       where m.marca=$1 and i.valor_unitario_estimado > 0`, p),
    q<LicRow>(`select ${editalCols}
       from public.v_marcas m join public.licitacoes_ti l on l.pncp_id=m.pncp_id
       where m.marca=$1 order by l.data_publicacao_pncp desc limit 18`, p),
  ]);

  return {
    kpi: kpiArr[0],
    orgaos,
    ufs,
    modal,
    tend,
    segmentos,
    preco: precoArr[0],
    editais: editais as LicRow[],
  };
}
