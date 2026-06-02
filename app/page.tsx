import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = Record<string, string | number | null>;
const n = (v: unknown) => (v == null ? 0 : Number(v));
const brl = (v: unknown) =>
  v == null ? "—" : "R$ " + n(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const int = (v: unknown) => n(v).toLocaleString("pt-BR");

async function safe<T = Row>(sql: string): Promise<T[]> {
  try {
    return (await q(sql)) as T[];
  } catch {
    return [];
  }
}

export default async function Dashboard() {
  const [kpi] = await safe(
    `select count(*) total,
            count(*) filter (where data_encerramento_proposta >= now()) abertas,
            count(distinct orgao_entidade) orgaos,
            count(*) filter (where score_oportunidade >= 80) alto_score
     from public.licitacoes_ti where e_ti`
  );
  const subs = await safe(
    `select subcategoria, count(*) n from public.licitacoes_ti where e_ti group by 1 order by 2 desc`
  );
  const marcas = await safe(
    `select marca, count(*) n from public.v_marcas group by 1 order by 2 desc limit 15`
  );
  const ticket = await safe(
    `select subcategoria, count(valor_total_estimado) n,
            percentile_cont(0.5) within group (order by valor_total_estimado) mediana
     from public.licitacoes_ti where e_ti and valor_total_estimado is not null
     group by 1 order by mediana desc nulls last`
  );
  const orgaos = await safe(
    `select orgao_entidade, count(*) n from public.licitacoes_ti where e_ti group by 1 order by 2 desc limit 12`
  );
  const ufs = await safe(
    `select uf, count(*) n from public.licitacoes_ti where e_ti and uf is not null group by 1 order by 2 desc limit 12`
  );

  const kpis = [
    { label: "Licitações de TI", value: int(kpi?.total) },
    { label: "Oportunidades abertas", value: int(kpi?.abertas) },
    { label: "Órgãos compradores", value: int(kpi?.orgaos) },
    { label: "Score alto (80+)", value: int(kpi?.alto_score) },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Inteligência de Licitações de TI</h1>
        <p className="text-sm text-zinc-400">
          Solugov · base PNCP · {int(kpi?.total)} licitações de TI
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-10">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="text-2xl font-bold">{k.value}</div>
            <div className="text-xs text-zinc-400 mt-1">{k.label}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card title="Ticket mediano por subcategoria" hint="mediana do valor estimado · n = com valor">
          <table className="w-full text-sm">
            <tbody>
              {ticket.map((r) => (
                <tr key={String(r.subcategoria)} className="border-b border-zinc-800/60">
                  <td className="py-1.5">{String(r.subcategoria)}</td>
                  <td className="py-1.5 text-right font-medium">{brl(r.mediana)}</td>
                  <td className="py-1.5 text-right text-zinc-500 text-xs">n={int(r.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Marcas mais demandadas" hint="ranking padronizado (v_marcas)">
          <Bars rows={marcas} labelKey="marca" />
        </Card>

        <Card title="Por subcategoria">
          <Bars rows={subs} labelKey="subcategoria" />
        </Card>

        <Card title="Top órgãos compradores de TI">
          <table className="w-full text-sm">
            <tbody>
              {orgaos.map((r) => (
                <tr key={String(r.orgao_entidade)} className="border-b border-zinc-800/60">
                  <td className="py-1.5 truncate max-w-[420px]">{String(r.orgao_entidade)}</td>
                  <td className="py-1.5 text-right font-medium">{int(r.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Por UF">
          <Bars rows={ufs} labelKey="uf" />
        </Card>
      </div>

      <p className="mt-10 text-xs text-zinc-500">
        ⓘ Cobertura de valor é parcial (enriquecimento em andamento) — o ticket mediano considera
        apenas licitações com valor preenchido (ver “n”).
      </p>
    </main>
  );
}

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="text-xs text-zinc-500 mb-3">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </div>
  );
}

function Bars({ rows, labelKey }: { rows: Row[]; labelKey: string }) {
  const max = Math.max(1, ...rows.map((r) => n(r.n)));
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={String(r[labelKey])} className="flex items-center gap-2 text-sm">
          <span className="w-44 truncate text-zinc-300">{String(r[labelKey] ?? "—")}</span>
          <div className="flex-1 h-4 rounded bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500/70"
              style={{ width: `${(n(r.n) / max) * 100}%` }}
            />
          </div>
          <span className="w-12 text-right text-zinc-400">{int(r.n)}</span>
        </div>
      ))}
    </div>
  );
}
