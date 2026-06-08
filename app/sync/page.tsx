import { getSyncStatus } from "@/lib/sync";
import PageHeader from "@/components/PageHeader";
import AutoRefresh from "@/components/sync/AutoRefresh";

export const dynamic = "force-dynamic";

const n = (v: unknown) => (v == null ? 0 : Number(v));
const int = (v: unknown) => n(v).toLocaleString("pt-BR");
const dt = (s: unknown) =>
  !s ? "—" : new Date(String(s)).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const d = (s: unknown) => (!s ? "—" : new Date(String(s)).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }));
const ago = (s: unknown) => {
  if (!s) return "—";
  const m = Math.round((Date.now() - new Date(String(s)).getTime()) / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `há ${h}h` : `há ${Math.round(h / 24)}d`;
};

const FONTE_LABEL: Record<string, string> = {
  backfill_v2: "Backfill (varredura completa)",
  pncp: "Diário (n8n)",
  backfill: "Backfill antigo (v1)",
};

export default async function Sync() {
  const s = await getSyncStatus();
  const k = s.kpi as Record<string, unknown>;
  const pp = s.pipe as Record<string, unknown>;
  const maxDia = Math.max(1, ...s.porDia.map((r) => n(r.n)));
  const maxCap = Math.max(1, ...s.captura.map((r) => n(r.eti)));
  const etaMin = pp.etaMin == null ? null : n(pp.etaMin);
  const etaTxt = etaMin == null ? "—" : etaMin < 60 ? `~${etaMin} min` : `~${(etaMin / 60).toFixed(1)} h`;

  const kpis = [
    { label: "Base total (TI)", value: int(k.ti), sub: `${int(k.total_all)} processos no banco` },
    { label: "Oportunidades abertas", value: int(k.abertas), sub: "prazo vigente", accent: true },
    { label: "Em análise (IA)", value: int(k.pendentes), sub: "aguardando classificação" },
    { label: "Adicionadas hoje", value: int(k.hoje), sub: `${int(k.d7)} nos últimos 7 dias` },
  ];

  return (
    <main className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
      <PageHeader
        kicker="Operação · Pipeline de dados"
        title="Sincronização"
        subtitle="Acompanhe a coleta do PNCP em tempo real — backfill histórico e o robô diário."
        actions={<AutoRefresh seconds={15} />}
      />

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kp) => (
          <div key={kp.label} className="card p-4">
            <div className="label">{kp.label}</div>
            <div className={"num mt-1.5 text-2xl font-bold leading-none " + (kp.accent ? "text-gradient-primary" : "text-[var(--ink)]")}>
              {kp.value}
            </div>
            <div className="mt-1.5 text-[11px] text-[var(--muted)]">{kp.sub}</div>
          </div>
        ))}
      </div>

      {/* Pipeline: 2 fases */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {/* Fase 1 — Ingestão */}
        <div className="card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-[var(--ink)]">1 · Ingestão (nuvem)</h3>
            <span className={"badge inline-flex items-center gap-1.5 " + (pp.ingerindo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
              <span className={"h-1.5 w-1.5 rounded-full " + (pp.ingerindo ? "animate-pulse bg-emerald-500" : "bg-gray-400")} />
              {pp.ingerindo ? "ingerindo" : "ocioso"}
            </span>
          </div>
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="text-[var(--ink-soft)]"><b className="num">{int(pp.diasCobertos)}</b> de {int(pp.target)} dias cobertos</span>
            <span className="num font-bold text-[var(--brand)]">{int(pp.ingestPct)}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[var(--line-soft)]">
            <div className="h-full rounded-full bg-[var(--brand)] transition-all duration-700" style={{ width: `${n(pp.ingestPct)}%` }} />
          </div>
          <p className="mt-3 text-[12px] text-[var(--muted)]">Busca todos os editais do PNCP (Edge Function paralela). Rápido — minutos.</p>
        </div>

        {/* Fase 2 — Classificação */}
        <div className="card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-[var(--ink)]">2 · Classificação (IA)</h3>
            <span className={"badge inline-flex items-center gap-1.5 " + (pp.classificando ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
              <span className={"h-1.5 w-1.5 rounded-full " + (pp.classificando ? "animate-pulse bg-emerald-500" : "bg-gray-400")} />
              {pp.classificando ? "classificando" : "ocioso"}
            </span>
          </div>
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="text-[var(--ink-soft)]"><b className="num">{int(pp.pendentes)}</b> pendentes</span>
            <span className="num font-bold text-[var(--brand)]">{int(pp.classifyPct)}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[var(--line-soft)]">
            <div className="h-full rounded-full bg-[var(--brand)] transition-all duration-700" style={{ width: `${n(pp.classifyPct)}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-[var(--muted)]">
            <span>Ritmo: <b className="num text-[var(--ink-soft)]">{int(pp.taxaMin)}</b>/min</span>
            <span>Tempo estimado: <b className="num text-[var(--ink-soft)]">{n(pp.pendentes) === 0 ? "concluído ✓" : etaTxt}</b></span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Ingestão por dia */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-3 font-semibold text-[var(--ink)]">Ingestão por dia <span className="text-xs font-normal text-[var(--muted)]">· quando foi gravado (14d)</span></h3>
          <div className="space-y-2">
            {s.porDia.length === 0 && <p className="text-sm text-[var(--muted)]">Sem gravações recentes.</p>}
            {s.porDia.map((r) => (
              <div key={String(r.d)} className="flex items-center gap-3 text-sm">
                <span className="num w-16 shrink-0 text-[var(--muted)]">{d(r.d)}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--line-soft)]">
                  <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${(n(r.n) / maxDia) * 100}%` }} />
                </div>
                <span className="num w-24 shrink-0 text-right text-[var(--ink-soft)]">
                  {int(r.n)} <span className="text-[var(--muted)]">({int(r.eti)} TI)</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Por fonte */}
        <div className="card p-5">
          <h3 className="mb-3 font-semibold text-[var(--ink)]">Por fonte</h3>
          <div className="space-y-3">
            {s.fontes.map((f) => (
              <div key={String(f.fonte)} className="border-b border-[var(--line-soft)] pb-2 last:border-0">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-[var(--ink-soft)]">
                    {FONTE_LABEL[String(f.fonte)] ?? String(f.fonte)}
                  </span>
                  <span className="num text-sm font-semibold text-[var(--ink)]">{int(f.eti)} TI</span>
                </div>
                <div className="text-[11px] text-[var(--muted)]">
                  {int(f.n)} total · {d(f.mn)}–{d(f.mx)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Saúde do diário */}
      <div className="card mt-4 p-5">
        <h3 className="mb-3 font-semibold text-[var(--ink)]">
          Captura diária recente <span className="text-xs font-normal text-[var(--muted)]">· TI por dia de publicação (10d) — saúde do robô diário</span>
        </h3>
        <div className="flex items-end gap-2">
          {s.captura.length === 0 && <p className="text-sm text-[var(--muted)]">Sem dados.</p>}
          {[...s.captura].reverse().map((r) => (
            <div key={String(r.d)} className="flex flex-1 flex-col items-center gap-1">
              <span className="num text-[11px] font-medium text-[var(--ink-soft)]">{int(r.eti)}</span>
              <div className="flex h-24 w-full items-end">
                <div
                  className="w-full rounded-t-md bg-[var(--brand)]"
                  style={{ height: `${Math.max(4, (n(r.eti) / maxCap) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-[var(--muted)]">{d(r.d).slice(0, 6)}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
