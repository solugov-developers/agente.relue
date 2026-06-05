import { getOpr } from "@/lib/opr";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/opr/Reveal";
import Bars from "@/components/opr/Bars";
import ValueBars from "@/components/opr/ValueBars";
import Sparkline from "@/components/opr/Sparkline";
import ComboChart from "@/components/opr/ComboChart";
import Donut from "@/components/opr/Donut";
import BrasilMap from "@/components/opr/BrasilMap";

const ESFERA: Record<string, string> = {
  M: "Municipal",
  E: "Estadual",
  F: "Federal",
  D: "Distrital",
  N: "Outros",
};
const FAIXA_LABEL: Record<number, string> = {
  1: "até R$ 50 mil",
  2: "R$ 50 – 200 mil",
  3: "R$ 200 mil – 1 mi",
  4: "acima de R$ 1 mi",
};

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

  const kpis: { label: string; value: string; sub?: string; accent?: boolean }[] = [
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
  const ufCounts: Record<string, number> = {};
  d.ufs.forEach((r) => (ufCounts[String(r.uf)] = n(r.n)));

  // novos boxes
  const valorSeg = d.valorSeg.slice(0, 7).map((r) => ({
    label: String(r.subcategoria ?? "—"),
    value: n(r.v),
    sub: `${int(r.n)} licitações`,
  }));
  const orgaosValor = d.orgaosValor.map((r) => ({
    label: String(r.orgao_entidade ?? "—"),
    value: n(r.v),
    sub: `${int(r.n)} processos`,
  }));
  const j = d.janela ?? {};
  const janela = [
    { label: "Encerram em 7 dias", value: n(j.d7), tone: "warn" as const },
    { label: "Encerram em 15 dias", value: n(j.d15), tone: "mid" as const },
    { label: "Encerram em 30 dias", value: n(j.d30), tone: "ok" as const },
  ];
  const janelaMax = Math.max(1, n(j.abertas));
  const faixasTotal = d.faixas.reduce((s, f) => s + n(f.n), 0) || 1;
  const faixas = d.faixas.map((f) => ({
    label: FAIXA_LABEL[Number(f.faixa)] ?? "—",
    n: n(f.n),
    pct: Math.round((n(f.n) / faixasTotal) * 100),
  }));
  const esferaTotal = d.esfera.reduce((s, e) => s + n(e.n), 0) || 1;
  const esfera = d.esfera
    .map((e) => ({ label: ESFERA[String(e.esfera_id)] ?? String(e.esfera_id), n: n(e.n), pct: Math.round((n(e.n) / esferaTotal) * 100) }))
    .sort((a, b) => b.n - a.n);

  const updatedAt = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <main className="mx-auto max-w-[1360px] px-5 py-8 md:px-8">
      <PageHeader
        kicker="Inteligência de Mercado"
        title="Visão geral"
        subtitle="Licitações públicas de TI — base PNCP · últimos 12 meses"
        actions={
          <span className="rounded-full bg-white px-3 py-1.5 text-xs text-[var(--muted)] ring-1 ring-[var(--line)]">
            atualizado {updatedAt}
          </span>
        }
      />

      {/* KPIs */}
      <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k, i) => (
          <Reveal key={k.label} delay={i * 0.03}>
            <div className="card h-full p-4">
              <div className="label">{k.label}</div>
              <div
                className={"num mt-1.5 text-[26px] font-bold leading-none " + (k.accent ? "text-gradient-primary" : "text-[var(--ink)]")}
              >
                {k.value}
              </div>
              {k.sub && <div className="mt-1.5 text-[11px] text-[var(--muted)]">{k.sub}</div>}
            </div>
          </Reveal>
        ))}
      </div>

      <div>
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

        {/* Onde está o dinheiro + UF */}
        <div className="mb-9 grid gap-4 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <Panel title="Onde está o dinheiro" hint="valor estimado em jogo por segmento">
              <ValueBars rows={valorSeg} />
            </Panel>
          </Reveal>
          <Reveal delay={0.05}>
            <Panel title="Distribuição geográfica" hint="licitações por UF">
              <BrasilMap counts={ufCounts} />
            </Panel>
          </Reveal>
        </div>

        {/* Janela comercial + Faixas + Esfera */}
        <div className="mb-9 grid gap-4 md:grid-cols-3">
          <Reveal>
            <Panel title="Janela comercial" hint="oportunidades abertas por prazo">
              <div className="space-y-3.5 pt-1">
                {janela.map((w) => (
                  <div key={w.label}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="text-sm text-[var(--ink-soft)]">{w.label}</span>
                      <span className="num text-lg font-bold text-[var(--ink)]">{int(w.value)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line-soft)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (w.value / janelaMax) * 100)}%`,
                          background: w.tone === "warn" ? "#d97706" : w.tone === "mid" ? "#a855f7" : "#7c3aed",
                        }}
                      />
                    </div>
                  </div>
                ))}
                <p className="pt-1 text-[11px] text-[var(--muted)]">
                  prazos de envio de proposta a partir de hoje
                </p>
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={0.05}>
            <Panel title="Faixas de valor" hint="estrutura do mercado">
              <div className="space-y-3 pt-1">
                {faixas.map((f) => (
                  <div key={f.label}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="text-[var(--ink-soft)]">{f.label}</span>
                      <span className="num text-[var(--muted)]">
                        {int(f.n)} · {f.pct}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line-soft)]">
                      <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${f.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={0.1}>
            <Panel title="Esfera administrativa" hint="quem está comprando">
              <div className="space-y-3 pt-1">
                {esfera.map((e) => (
                  <div key={e.label}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="text-[var(--ink-soft)]">{e.label}</span>
                      <span className="num text-[var(--muted)]">
                        {int(e.n)} · {e.pct}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line-soft)]">
                      <div className="h-full rounded-full bg-[var(--indigo)]" style={{ width: `${e.pct}%`, background: "var(--indigo)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </Reveal>
        </div>

        {/* Marcas + Contas-alvo por valor */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Reveal>
            <Panel title="Marcas mais demandadas" hint="fabricantes — padronizado (case/acento)">
              <Bars rows={marcas} />
            </Panel>
          </Reveal>
          <Reveal delay={0.05}>
            <Panel title="Contas-alvo por valor" hint="órgãos com maior volume financeiro">
              <ValueBars rows={orgaosValor} accent="fuchsia" />
            </Panel>
          </Reveal>
        </div>

        <p className="mt-8 text-center text-xs text-[var(--muted)]">
          Relue · Solugov · base PNCP · cobertura de valor/prazo em enriquecimento contínuo
        </p>
      </div>
    </main>
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
