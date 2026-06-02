import { getOpr } from "@/lib/opr";
import TopBar, { type Kpi } from "@/components/TopBar";
import Reveal from "@/components/opr/Reveal";
import Bars from "@/components/opr/Bars";
import Sparkline from "@/components/opr/Sparkline";
import ComboChart from "@/components/opr/ComboChart";
import Donut from "@/components/opr/Donut";
import BrasilMap from "@/components/opr/BrasilMap";

export const dynamic = "force-dynamic";

const n = (v: unknown) => (v == null ? 0 : Number(v));
const int = (v: unknown) => n(v).toLocaleString("pt-BR");
const brl = (v: unknown) => (v == null ? "—" : "R$ " + n(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 }));
const compact = (v: unknown) => {
  const x = n(v);
  if (x >= 1e9) return "R$ " + (x / 1e9).toFixed(1) + "bi";
  if (x >= 1e6) return "R$ " + (x / 1e6).toFixed(1) + "mi";
  if (x >= 1e3) return "R$ " + (x / 1e3).toFixed(0) + "k";
  return brl(x);
};

export default async function OPR() {
  const d = await getOpr();
  const k = d.kpi ?? {};
  const total = n(k.total) || 1;

  const kpis: Kpi[] = [
    { label: "Licitações de TI", value: int(k.total), sub: "12 meses" },
    { label: "Oportunidades abertas", value: int(k.abertas), sub: "prazo vigente", accent: true },
    { label: "Ticket mediano", value: brl(k.mediana_geral), sub: "global" },
    { label: "Valor em jogo", value: compact(k.valor), sub: "estimado" },
    { label: "Órgãos", value: int(k.orgaos), sub: "compradores" },
    { label: "Score alto", value: int(k.alto), sub: "80+" },
  ];

  const months = d.tendencia.map((t) => String(t.mes));
  const segByMonth: Record<string, Record<string, number>> = {};
  d.segMes.forEach((r) => {
    const s = String(r.subcategoria);
    (segByMonth[s] ??= {})[String(r.mes)] = n(r.n);
  });
  const segmentos = d.ticket.map((t) => {
    const s = String(t.subcategoria);
    return {
      sub: s,
      tot: n(t.total),
      nv: n(t.nv),
      mediana: t.mediana,
      spark: months.map((m) => segByMonth[s]?.[m] ?? 0),
    };
  });

  const tendencia = d.tendencia.map((t) => ({ mes: String(t.mes), n: n(t.n), valor: n(t.valor) }));
  const donut = d.modalidades.slice(0, 6).map((m) => ({ name: String(m.modalidade_nome), value: n(m.n) }));
  const marcas = d.marcas.map((r) => ({ label: String(r.marca ?? "—"), n: n(r.n) }));
  const orgaos = d.orgaos.map((r) => ({ label: String(r.orgao_entidade ?? "—"), n: n(r.n) }));
  const ufCounts: Record<string, number> = {};
  d.ufs.forEach((r) => (ufCounts[String(r.uf)] = n(r.n)));

  const updatedAt = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <>
      <TopBar kpis={kpis} updatedAt={updatedAt} />
      <main className="mx-auto max-w-[1440px] px-5 py-7">
        {/* Segmentos */}
        <SectionTitle title="Segmentos de TI" hint="distribuição, ticket mediano e tendência (12m)" />
        <div className="mb-9 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {segmentos.map((s, i) => (
            <Reveal key={s.sub} delay={i * 0.04}>
              <div className="card h-full p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium leading-tight text-[var(--ink)]">{s.sub}</span>
                  <span className="badge bg-[var(--brand-soft)] text-[var(--brand)]">
                    {Math.round((s.tot / total) * 100)}%
                  </span>
                </div>
                <div className="num mt-2 text-2xl font-bold">{int(s.tot)}</div>
                <div className="-mx-1 mt-1">
                  <Sparkline data={s.spark} />
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-[var(--line-soft)] pt-2 text-[11px] text-[var(--muted)]">
                  <span>
                    ticket <b className="num text-[var(--ink-soft)]">{compact(s.mediana)}</b>
                  </span>
                  <span className="num">n={int(s.nv)}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Evolução + Modalidade */}
        <div className="mb-9 grid gap-4 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <Panel title="Evolução mensal" hint="licitações (barras) e valor estimado (linha)">
              <ComboChart data={tendencia} />
            </Panel>
          </Reveal>
          <Reveal delay={0.05}>
            <Panel title="Como o governo compra" hint="por modalidade">
              <Donut data={donut} />
            </Panel>
          </Reveal>
        </div>

        {/* Oportunidades + UF */}
        <div className="mb-9 grid gap-4 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <Panel title="Oportunidades quentes" hint="abertas, maior score — prioridade comercial">
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="label border-b border-[var(--line)] text-left">
                      <th className="py-2 font-medium">Score</th>
                      <th className="py-2 font-medium">Objeto</th>
                      <th className="py-2 text-right font-medium">Valor est.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.oportunidades.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-[var(--muted)]">
                          Nenhuma com prazo aberto preenchido ainda.
                        </td>
                      </tr>
                    )}
                    {d.oportunidades.map((o) => (
                      <tr key={String(o.pncp_id)} className="border-b border-[var(--line-soft)] align-top">
                        <td className="py-2">
                          <span className="num inline-grid h-7 w-9 place-items-center rounded-md bg-amber-50 text-xs font-bold text-amber-700">
                            {int(o.score_oportunidade)}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <a href={String(o.link)} target="_blank" className="block max-w-[460px] truncate text-[var(--ink)] hover:text-[var(--brand)] hover:underline">
                            {String(o.resumo ?? o.orgao_entidade)}
                          </a>
                          <span className="block truncate text-xs text-[var(--muted)]">
                            {String(o.orgao_entidade)} · {String(o.uf)} · {String(o.subcategoria)}
                          </span>
                        </td>
                        <td className="num py-2 text-right text-[var(--ink-soft)]">{brl(o.valor_total_estimado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </Reveal>
          <Reveal delay={0.05}>
            <Panel title="Distribuição por UF">
              <BrasilMap counts={ufCounts} />
            </Panel>
          </Reveal>
        </div>

        {/* Marcas + Órgãos */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Reveal>
            <Panel title="Marcas mais demandadas" hint="padronizado (case/acento)">
              <Bars rows={marcas} />
            </Panel>
          </Reveal>
          <Reveal delay={0.05}>
            <Panel title="Contas-alvo" hint="órgãos que mais compram TI">
              <Bars rows={orgaos} accent="green" />
            </Panel>
          </Reveal>
        </div>

        <p className="mt-8 text-center text-xs text-[var(--muted)]">
          Relue · Solugov · base PNCP · cobertura de valor/prazo em enriquecimento contínuo
        </p>
      </main>
    </>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <h2 className="text-base font-semibold text-[var(--ink)]">{title}</h2>
      {hint && <span className="text-xs text-[var(--muted)]">{hint}</span>}
    </div>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="card h-full p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="font-semibold text-[var(--ink)]">{title}</h3>
        {hint && <span className="text-xs text-[var(--muted)]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
