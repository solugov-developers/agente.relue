import { q } from "./db";

export type LicFilters = {
  q?: string;
  uf?: string;
  sub?: string;
  mod?: string;
  status?: string; // "abertas" | "todas"
  ordem?: string; // "recente" | "score" | "valor" | "prazo"
  page?: number;
  pageSize?: number;
};

export type LicRow = {
  pncp_id: string;
  orgao_entidade: string | null;
  unidade_orgao: string | null;
  uf: string | null;
  municipio: string | null;
  subcategoria: string | null;
  modalidade_nome: string | null;
  valor_total_estimado: string | null;
  data_encerramento_proposta: string | null;
  data_abertura_proposta: string | null;
  data_publicacao_pncp: string | null;
  score_oportunidade: number | null;
  situacao_compra_nome: string | null;
  resumo: string | null;
  objeto_compra: string | null;
  link: string | null;
  aberta: boolean;
};

const ORDER: Record<string, string> = {
  recente: "data_publicacao_pncp desc nulls last",
  score: "score_oportunidade desc nulls last, valor_total_estimado desc nulls last",
  valor: "valor_total_estimado desc nulls last",
  prazo: "(data_encerramento_proposta >= now()) desc, data_encerramento_proposta asc nulls last",
};

export async function listLicitacoes(f: LicFilters) {
  const where: string[] = ["e_ti"];
  const p: unknown[] = [];
  const add = (v: unknown) => {
    p.push(v);
    return "$" + p.length;
  };

  if (f.q && f.q.trim()) {
    const ph = add("%" + f.q.trim() + "%");
    where.push(
      `(objeto_compra ilike ${ph} or resumo ilike ${ph} or orgao_entidade ilike ${ph} or municipio ilike ${ph})`
    );
  }
  if (f.uf) where.push(`uf = ${add(f.uf)}`);
  if (f.sub) where.push(`subcategoria = ${add(f.sub)}`);
  if (f.mod) where.push(`modalidade_nome = ${add(f.mod)}`);
  if (f.status === "abertas") where.push(`data_encerramento_proposta >= now()`);

  const order = ORDER[f.ordem ?? "recente"] ?? ORDER.recente;
  const pageSize = Math.min(Math.max(f.pageSize ?? 25, 5), 100);
  const page = Math.max(f.page ?? 1, 1);
  const offset = (page - 1) * pageSize;
  const limPh = add(pageSize);
  const offPh = add(offset);

  const sql = `
    select pncp_id, orgao_entidade, unidade_orgao, uf, municipio, subcategoria, modalidade_nome,
           valor_total_estimado, data_encerramento_proposta, data_abertura_proposta, data_publicacao_pncp, score_oportunidade,
           situacao_compra_nome, resumo, objeto_compra, link,
           (data_encerramento_proposta >= now()) aberta,
           count(*) over() _total
    from public.licitacoes_ti
    where ${where.join(" and ")}
    order by ${order}
    limit ${limPh} offset ${offPh}`;

  const rows = await q<LicRow & { _total: string }>(sql, p);
  const total = rows.length ? Number(rows[0]._total) : 0;
  return { rows: rows as unknown as LicRow[], total, page, pageSize };
}

export async function listFacets() {
  const [ufs, subs, mods] = await Promise.all([
    q<{ uf: string; n: string }>(
      `select uf, count(*) n from public.licitacoes_ti where e_ti and uf is not null group by 1 order by 1`
    ),
    q<{ subcategoria: string; n: string }>(
      `select subcategoria, count(*) n from public.licitacoes_ti where e_ti and subcategoria is not null group by 1 order by 2 desc`
    ),
    q<{ modalidade_nome: string; n: string }>(
      `select modalidade_nome, count(*) n from public.licitacoes_ti where e_ti and modalidade_nome is not null group by 1 order by 2 desc`
    ),
  ]);
  return { ufs, subs, mods };
}
