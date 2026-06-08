import { q } from "./db";

export async function getSyncStatus() {
  const safe = (sql: string) => (q(sql) as Promise<Record<string, unknown>[]>).catch(() => []);

  const [kpiArr, porDia, fontes, captura, backfill] = await Promise.all([
    safe(
      `select count(*) total_all,
              count(*) filter (where e_ti) ti,
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
      `select count(*) n, count(*) filter (where e_ti) eti,
              min(data_publicacao_pncp)::date mn, max(data_publicacao_pncp)::date mx,
              count(distinct data_publicacao_pncp::date) dias_done,
              count(distinct data_publicacao_pncp::date) filter (where created_at >= now() - interval '60 min') dias_1h,
              count(*) filter (where created_at >= now() - interval '60 min') linhas_1h,
              count(*) filter (where created_at >= now() - interval '5 min') linhas_5m
       from public.licitacoes_ti where fonte = 'backfill_v2'`
    ),
  ]);

  const TARGET_DIAS = 311; // escopo do backfill: 12 meses (newest-first), pulando domingos
  const b = backfill[0] ?? {};
  const diasDone = Number(b.dias_done ?? 0);
  const dias1h = Number(b.dias_1h ?? 0);
  const pct = Math.min(100, Math.round((diasDone / TARGET_DIAS) * 100));
  const etaHoras = dias1h > 0 ? Math.max(0, Math.round(((TARGET_DIAS - diasDone) / dias1h) * 10) / 10) : null;
  const rodando = Number(b.linhas_5m ?? 0) > 0;

  return {
    kpi: kpiArr[0] ?? {},
    porDia,
    fontes,
    captura,
    backfill: { ...b, target: TARGET_DIAS, pct, etaHoras, rodando, diasDone, dias1h },
  };
}
