import { q } from "./db";

export async function getSyncStatus() {
  const safe = (sql: string) => (q(sql) as Promise<Record<string, unknown>[]>).catch(() => []);

  const [kpiArr, porDia, fontes, captura, pipeArr] = await Promise.all([
    safe(
      `select count(*) total_all,
              count(*) filter (where e_ti) ti,
              count(*) filter (where e_ti is null) pendentes,
              count(*) filter (where e_ti and data_encerramento_proposta >= now()) abertas,
              count(*) filter (where created_at >= date_trunc('day', now())) hoje,
              count(*) filter (where created_at >= now() - interval '7 days') d7,
              max(greatest(created_at, coalesce(updated_at, created_at))) ultimo
       from public.licitacoes_ti`
    ),
    safe(
      `select created_at::date d, count(*) n, count(*) filter (where e_ti) eti
       from public.licitacoes_ti
       where created_at >= now() - interval '14 days'
       group by 1 order by 1 desc`
    ),
    safe(
      `select coalesce(fonte,'(sem fonte)') fonte, count(*) n, count(*) filter (where e_ti) eti,
              count(*) filter (where e_ti is null) pend,
              min(data_publicacao_pncp)::date mn, max(data_publicacao_pncp)::date mx
       from public.licitacoes_ti group by 1 order by 2 desc`
    ),
    safe(
      `select data_publicacao_pncp::date d, count(*) filter (where e_ti) eti
       from public.licitacoes_ti
       where data_publicacao_pncp >= now() - interval '10 days'
       group by 1 order by 1 desc`
    ),
    safe(
      `select count(distinct data_publicacao_pncp::date) filter (where data_publicacao_pncp >= now() - interval '12 months') dias_cobertos,
              count(*) filter (where e_ti is null) pendentes,
              count(*) filter (where e_ti is not null) classificados,
              count(*) filter (where classified_at >= now() - interval '10 min') class_10m,
              count(*) filter (where created_at >= now() - interval '10 min') ing_10m
       from public.licitacoes_ti`
    ),
  ]);

  const TARGET_DIAS = 314; // ~12 meses (newest-first, pulando domingos)
  const p = pipeArr[0] ?? {};
  const n = (v: unknown) => (v == null ? 0 : Number(v));
  const diasCobertos = n(p.dias_cobertos);
  const pendentes = n(p.pendentes);
  const classificados = n(p.classificados);
  const ingestPct = Math.min(100, Math.round((diasCobertos / TARGET_DIAS) * 100));
  const totalCand = pendentes + classificados;
  const classifyPct = totalCand > 0 ? Math.round((classificados / totalCand) * 100) : 0;
  const taxaMin = n(p.class_10m) / 10; // classificados por minuto
  const etaMin = taxaMin > 0 ? Math.round(pendentes / taxaMin) : null;
  const ingerindo = n(p.ing_10m) > 0;
  const classificando = n(p.class_10m) > 0;

  return {
    kpi: kpiArr[0] ?? {},
    porDia,
    fontes,
    captura,
    pipe: {
      diasCobertos,
      target: TARGET_DIAS,
      ingestPct,
      pendentes,
      classificados,
      classifyPct,
      taxaMin: Math.round(taxaMin),
      etaMin,
      ingerindo,
      classificando,
    },
  };
}
