import Link from "next/link";
import { ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import { getOpr } from "@/lib/opr";
import { listLicitacoes } from "@/lib/licitacoes";
import PageHeader from "@/components/PageHeader";
import RangeTabs from "@/components/opr/RangeTabs";
import Reveal from "@/components/opr/Reveal";
import Bars from "@/components/opr/Bars";
import ValueBars from "@/components/opr/ValueBars";
import Sparkline from "@/components/opr/Sparkline";
import ComboChart from "@/components/opr/ComboChart";
import Donut from "@/components/opr/Donut";
import BrasilMap from "@/components/opr/BrasilMap";

export const dynamic = "force-dynamic";

const ESFERA: Record<string, string> = { M: "Municipal", E: "Estadual", F: "Federal", D: "Distrital", N: "Outros" };
const FAIXA_LABEL: Record<number, string> = {
  1: "até R$ 50 mil",
  2: "R$ 50 – 200 mil",
  3: "R$ 200 mil – 1 mi",
  4: "acima de R$ 1 mi",
};

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
const fmtDays = (s: unknown) => {
  if (!s) return null;
  const d = Math.ceil((new Date(String(s)).getTime() - Date.now()) / 86400000);
  return d < 0 ? null : d;
};

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Painel({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const rangeRaw = Array.isArray(sp.range) ? sp.range[0] : sp.range;
  const months = [6, 12, 18].includes(Number(rangeRaw)) ? Number(rangeRaw) : 12;

  const [d, hot] = await Promise.all([
    getOpr(months),
    listLicitacoes({ status: "abertas", ordem: "score", pageSize: 6 }),
  ]);
  const k = d.kpi ?? {};
  const total = n(k.total) || 1;

  const tendencia = d.tendencia.map((t) => ({ mes: String(t.mes), n: n(t.n), valor: n(t.valor) }));
  const sparkN = tendencia.map((t) => t.n);
  const sparkV = tendencia.map((t) => t.valor);
  const delta = (arr: number[]) => {
    if (arr.length < 2) return null;
    const a = arr[arr.length - 1];
    const b = arr[arr.length - 2];
    return b > 0 ? Math.round(((a - b) / b) * 100) : null;
  };
  const dN = delta(sparkN);
  const dV = delta(sparkV);

  const j = d.janela ?? {};
  const janelaMax = Math.max(1, n(j.abertas));
  const janela = [
    { label: "Encerram em 7 dias", value: n(j.d7), tone: "warn" as const },
    { label: "Encerram em 15 dias", value: n(j.d15), tone: "mid" as const },
    { label: "Encerram em 30 dias", value: n(j.d30), tone: "ok" as const },
  ];

  const kpis = [
    { label: "Licitações de TI", value: int(k.total), delta: dN, spark: sparkN as number[] | null, sub: `${months} meses`, accent: false, href: undefined as string | undefined },
    { label: "Oportunidades abertas", value: int(k.abertas), delta: null, spark: null, sub: `${int(j.d7)} encerram em 7 dias`, accent: true, href: "/licitacoes?status=abertas&ordem=score" },
    { label: "Valor em jogo", value: compact(k.valor), delta: dV, spark: sparkV as number[] | null, sub: "estimado total", accent: false, href: "/licitacoes?ordem=valor" },
    { label: "Ticket mediano", value: brl(k.mediana_geral), delta: null, spark: null, sub: "global", accent: false, href: undefined },
  ];

  const valorSeg = d.valorSeg.slice(0, 7).map((r) => ({ label: String(r.subcategoria ?? "—"), value: n(r.v), sub: `${int(r.n)} licitações` }));
  const orgaosValor = d.orgaosValor.map((r) => ({ label: String(r.orgao_entidade ?? "—"), value: n(r.v), sub: `${int(r.n)} processos` }));
  const marcas = d.marcas.map((r) => ({ label: String(r.marca ?? "—"), n: n(r.n) }));
  const donut = d.modalidades.slice(0, 6).map((m) => ({ name: String(m.modalidade_nome), value: n(m.n) }));
  const ufCounts: Record<string, number> = {};
  d.ufs.forEach((r) => (ufCounts[String(r.uf)] = n(r.n)));

  const segs = d.ticket.slice(0, 8).map((t) => ({
    sub: String(t.subcategoria),
    nv: n(t.total),
    mediana: t.mediana,
    pct: Math.round((n(t.total) / total) * 100),
  }));

  const faixasTotal = d.faixas.reduce((s, f) => s + n(f.n), 0) || 1;
  const faixas = d.faixas.map((f) => ({ label: FAIXA_LABEL[Number(f.faixa)] ?? "—", n: n(f.n), pct: Math.round((n(f.n) / faixasTotal) * 100) }));
  const esferaTotal = d.esfera.reduce((s, e) => s + n(e.n), 0) || 1;
  const esfera = d.esfera
    .map((e) => ({ label: ESFERA[String(e.esfera_id)] ?? String(e.esfera_id), n: n(e.n), pct: Math.round((n(e.n) / esferaTotal) * 100) }))
    .sort((a, b) => b.n - a.n);

  const updatedAt = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <main className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
      <PageHeader
        kicker="Inteligência de Mercado"
        title="Visão geral"
        subtitle="Licitações públicas de TI — base PNCP"
        actions={
          <div className="flex items-center gap-2">
            <RangeTabs />
            <span className="hidden rounded-full bg-white/[0.05] px-3 py-1.5 text-xs text-[var(--muted)] ring-1 ring-[var(--line)] sm:inline">
              {updatedAt}
            </span>
          </div>
        }
      />

      {/* KPIs */}
      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kp, i) => {
          const inner = (
            <div className="card h-full p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="label">{kp.label}</div>
                {kp.delta != null && (
                  <span className={"num inline-flex items-center gap-0.5 text-[11px] font-semibold " + (kp.delta >= 0 ? "text-[var(--pos)]" : "text-[var(--neg)]")}>
                    {kp.delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {Math.abs(kp.delta)}%
                  </span>
                )}
              </div>
              <div className={"num mt-2 text-[30px] font-bold leading-none " + (kp.accent ? "text-gradient-primary" : "glow-num text-[var(--ink)]")}>
                {kp.value}
              </div>
              {kp.spark ? (
                <div className="-mx-1 mt-2 h-8">
                  <Sparkline data={kp.spark} color="#2596b8" />
                </div>
              ) : (
                <div className="mt-2 h-8" />
              )}
              <div className={"mt-1 text-[11px] " + (kp.href ? "text-[var(--blue)]" : "text-[var(--muted)]")}>{kp.sub}</div>
            </div>
          );
          return (
            <Reveal key={kp.label} delay={i * 0.04}>
              {kp.href ? (
                <Link href={kp.href} className="block h-full">
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </Reveal>
          );
        })}
      </div>

      {/* Oportunidades quentes + Janela comercial */}
      <div className="mb-7 grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <div className="card flex h-full flex-col overflow-hidden p-0">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-5 py-3.5">
              <div>
                <h3 className="font-semibold text-[var(--ink)]">Oportunidades quentes</h3>
                <p className="text-xs text-[var(--muted)]">abertas com maior score de oportunidade</p>
              </div>
              <Link href="/licitacoes?status=abertas&ordem=score" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--blue)] hover:underline">
                ver todas <ArrowUpRight size={13} />
              </Link>
            </div>
            <div className="divide-y divide-[var(--line-soft)]">
              {hot.rows.length === 0 ? (
                <div className="p-8 text-center text-sm text-[var(--muted)]">Sem oportunidades abertas no momento.</div>
              ) : (
                hot.rows.map((r) => {
                  const dias = fmtDays(r.data_encerramento_proposta);
                  const score = r.score_oportunidade == null ? null : Number(r.score_oportunidade);
                  return (
                    <Link key={r.pncp_id} href={`/edital?id=${encodeURIComponent(r.pncp_id)}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-white/[0.03]">
                      {score != null && (
                        <span className="num grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--blue-soft)] text-[13px] font-bold text-[var(--blue)]">
                          {score}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium text-[var(--ink)]">{r.resumo || r.objeto_compra || "—"}</div>
                        <div className="truncate text-[12px] text-[var(--muted)]">
                          {r.orgao_entidade ?? "—"}
                          {r.uf ? ` · ${r.uf}` : ""}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="num text-sm font-semibold text-[var(--ink)]">{compact(r.valor_total_estimado)}</div>
                        {dias != null && (
                          <div className={"num text-[11px] " + (dias <= 7 ? "text-[var(--warn)]" : "text-[var(--muted)]")}>
                            {dias === 0 ? "encerra hoje" : `${dias}d restantes`}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <Panel title="Janela comercial" hint="prazos abrindo">
            <div className="space-y-4 pt-1">
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
                        background: w.tone === "warn" ? "#f59e0b" : w.tone === "mid" ? "#2596b8" : "#167591",
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className="pt-1 text-[11px] text-[var(--muted)]">prazos de envio de proposta a partir de hoje</p>
            </div>
          </Panel>
        </Reveal>
      </div>

      {/* Evolução do mercado */}
      <Reveal className="mb-7 block">
        <Panel title="Evolução do mercado" hint={`licitações (barras) e valor estimado (linha) · ${months} meses`}>
          <ComboChart data={tendencia} />
        </Panel>
      </Reveal>

      {/* Onde está o dinheiro + Mapa */}
      <div className="mb-7 grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Panel title="Onde está o dinheiro" hint="valor estimado em jogo por segmento">
            <ValueBars rows={valorSeg} linkBase="/licitacoes?sub=" />
          </Panel>
        </Reveal>
        <Reveal delay={0.05}>
          <Panel title="Distribuição geográfica" hint="licitações por UF">
            <BrasilMap counts={ufCounts} />
          </Panel>
        </Reveal>
      </div>

      {/* Segmentos compacto + Marcas */}
      <div className="mb-7 grid gap-4 lg:grid-cols-2">
        <Reveal>
          <Panel title="Segmentos de TI" hint="participação · volume · ticket">
            <div className="space-y-2.5">
              {segs.map((s) => (
                <Link key={s.sub} href={`/licitacoes?sub=${encodeURIComponent(s.sub)}`} className="group flex items-center gap-3 text-sm">
                  <span className="w-40 shrink-0 truncate text-[var(--ink-soft)] group-hover:text-[var(--blue)]" title={s.sub}>
                    {s.sub}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--line-soft)]">
                    <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: "linear-gradient(90deg,#167591,#2596b8)" }} />
                  </div>
                  <span className="num w-10 shrink-0 text-right text-[var(--muted)]">{int(s.nv)}</span>
                  <span className="num w-16 shrink-0 text-right text-[var(--ink-soft)]" title="ticket mediano">
                    {compact(s.mediana)}
                  </span>
                </Link>
              ))}
            </div>
          </Panel>
        </Reveal>
        <Reveal delay={0.05}>
          <Panel title="Marcas mais demandadas" hint="fabricantes — padronizado">
            <Bars rows={marcas} linkBase="/marcas?m=" />
          </Panel>
        </Reveal>
      </div>

      {/* Contas-alvo + Modalidade */}
      <div className="mb-7 grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Panel title="Contas-alvo por valor" hint="órgãos com maior volume financeiro">
            <ValueBars rows={orgaosValor} accent="fuchsia" linkBase="/licitacoes?q=" />
          </Panel>
        </Reveal>
        <Reveal delay={0.05}>
          <Panel title="Como o governo compra" hint="por modalidade">
            <Donut data={donut} />
          </Panel>
        </Reveal>
      </div>

      {/* Perfil do mercado: faixas + esfera */}
      <div className="grid gap-4 md:grid-cols-2">
        <Reveal>
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
                    <div className="h-full rounded-full bg-[var(--blue)]" style={{ width: `${f.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </Reveal>
        <Reveal delay={0.05}>
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
                    <div className="h-full rounded-full" style={{ width: `${e.pct}%`, background: "var(--indigo)" }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </Reveal>
      </div>

      <p className="mt-8 text-center text-xs text-[var(--muted)]">
        Relue · Solugov · base PNCP · cobertura de valor/prazo em enriquecimento contínuo
      </p>
    </main>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="card h-full p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="font-semibold text-[var(--ink)]">{title}</h3>
        {hint && <span className="hidden text-xs text-[var(--muted)] sm:inline">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
