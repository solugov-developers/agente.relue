import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listMarcas, getMarca } from "@/lib/marcas";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/opr/Reveal";
import ValueBars from "@/components/opr/ValueBars";
import ComboChart from "@/components/opr/ComboChart";
import Donut from "@/components/opr/Donut";
import BrasilMap from "@/components/opr/BrasilMap";
import LicitacaoCard from "@/components/lic/LicitacaoCard";
import MarcaSearch from "@/components/marcas/MarcaSearch";
import ViewToggle from "@/components/ViewToggle";

export const dynamic = "force-dynamic";

const n = (v: unknown) => (v == null ? 0 : Number(v));
const int = (v: unknown) => n(v).toLocaleString("pt-BR");
const brl = (v: unknown) => (v == null ? "—" : "R$ " + n(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 }));
const compact = (v: unknown) => {
  const x = n(v);
  if (!x) return "—";
  if (x >= 1e9) return "R$ " + (x / 1e9).toFixed(2) + " bi";
  if (x >= 1e6) return "R$ " + (x / 1e6).toFixed(0) + " mi";
  if (x >= 1e3) return "R$ " + (x / 1e3).toFixed(0) + "k";
  return brl(x);
};

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Marcas({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const pick = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) || undefined;
  };
  const marca = pick("m");
  if (marca) return <Detail marca={marca} />;

  const search = pick("q");
  const view = pick("view") === "lista" ? "lista" : "cards";
  const marcas = await listMarcas(search);
  const totalMarcas = marcas[0]?.total ? Number(marcas[0].total) : marcas.length;

  return (
    <main className="mx-auto max-w-[1360px] px-5 py-8 md:px-8">
      <PageHeader
        kicker="Channel · Fabricantes"
        title="Fabricantes & marcas"
        subtitle={`${totalMarcas.toLocaleString("pt-BR")} fabricantes com 2+ licitações — abra uma marca para o panorama completo (material de pitch).`}
        actions={<ViewToggle />}
      />
      <div className="mb-5">
        <MarcaSearch initial={search ?? ""} />
      </div>
      {marcas.length < totalMarcas && (
        <p className="mb-3 text-xs text-[var(--muted)]">
          mostrando os {marcas.length} maiores de {totalMarcas.toLocaleString("pt-BR")} — refine pela busca para achar um fabricante específico
        </p>
      )}

      {marcas.length === 0 ? (
        <div className="card p-14 text-center text-[var(--muted)]">Nenhuma marca encontrada.</div>
      ) : view === "lista" ? (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="label border-b border-[var(--line)] text-left">
                  <th className="w-12 px-4 py-3 text-center font-medium">#</th>
                  <th className="px-3 py-3 font-medium">Fabricante</th>
                  <th className="px-3 py-3 text-right font-medium">Licitações</th>
                  <th className="px-3 py-3 text-right font-medium">Valor em jogo</th>
                  <th className="px-3 py-3 text-center font-medium">Abertas</th>
                  <th className="px-4 py-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {marcas.map((m, i) => (
                  <tr key={m.marca} className="border-b border-[var(--line-soft)] hover:bg-white/[0.04]">
                    <td className="num px-4 py-3 text-center text-[var(--muted)]">{i + 1}</td>
                    <td className="px-3 py-3">
                      <Link href={`/marcas?m=${encodeURIComponent(m.marca)}`} className="font-medium capitalize text-[var(--ink)] hover:text-[var(--brand)]">
                        {m.marca}
                      </Link>
                    </td>
                    <td className="num px-3 py-3 text-right text-[var(--ink-soft)]">{int(m.n)}</td>
                    <td className="num px-3 py-3 text-right font-medium text-[var(--ink)]">{compact(m.valor)}</td>
                    <td className="px-3 py-3 text-center">
                      {n(m.abertas) > 0 ? (
                        <span className="badge bg-emerald-400/15 text-emerald-300">{int(m.abertas)}</span>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/marcas?m=${encodeURIComponent(m.marca)}`} className="text-xs font-medium text-[var(--brand)] hover:underline">
                        ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {marcas.map((m) => (
            <Link key={m.marca} href={`/marcas?m=${encodeURIComponent(m.marca)}`} className="card group block h-full p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[15px] font-semibold capitalize text-[var(--ink)] group-hover:text-[var(--brand)]">
                  {m.marca}
                </span>
                {n(m.abertas) > 0 && (
                  <span className="badge bg-emerald-400/15 text-emerald-300">{int(m.abertas)} abertas</span>
                )}
              </div>
              <div className="num mt-3 text-2xl font-bold text-[var(--ink)]">{compact(m.valor)}</div>
              <div className="mt-1 flex items-center justify-between text-[12px] text-[var(--muted)]">
                <span>{int(m.n)} licitações</span>
                <span className="text-[var(--brand)] opacity-0 transition group-hover:opacity-100">ver →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

async function Detail({ marca }: { marca: string }) {
  const d = await getMarca(marca);
  const k = d.kpi ?? {};
  const now = Date.now();

  const tend = d.tend.map((t) => ({ mes: String(t.mes), n: n(t.n), valor: n(t.valor) }));
  const donut = d.modal.slice(0, 6).map((m) => ({ name: String(m.name), value: n(m.value) }));
  const orgaos = d.orgaos.map((o) => ({ label: String(o.label ?? "—"), value: n(o.v), sub: `${int(o.n)} licitações` }));
  const ufCounts: Record<string, number> = {};
  d.ufs.forEach((r) => (ufCounts[String(r.uf)] = n(r.n)));

  const kpis = [
    { label: "Licitações", value: int(k.n), sub: "12 meses" },
    { label: "Valor em jogo", value: compact(k.valor), sub: "estimado", accent: true },
    { label: "Abertas", value: int(k.abertas), sub: "prazo vigente" },
    { label: "Ticket mediano", value: brl(k.mediana), sub: "por licitação" },
    {
      label: "Preço unit. mediano",
      value: d.preco && d.preco.mediana != null ? brl(d.preco.mediana) : "—",
      sub: d.preco ? `${int(d.preco.n)} itens` : "sem itens",
    },
  ];

  return (
    <main className="mx-auto max-w-[1360px] px-5 py-8 md:px-8">
      <Link
        href="/marcas"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] transition hover:text-[var(--brand)]"
      >
        <ArrowLeft size={15} /> Fabricantes
      </Link>
      <PageHeader
        kicker="Channel · Panorama do fabricante"
        title={marca}
        subtitle="Demanda do governo por este fabricante — distribuição, evolução e oportunidades abertas."
      />

      <div className="mb-9 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kp, i) => (
          <Reveal key={kp.label} delay={i * 0.03}>
            <div className="card h-full p-4">
              <div className="label">{kp.label}</div>
              <div className={"num mt-1.5 text-[22px] font-bold leading-none " + (kp.accent ? "text-gradient-primary" : "text-[var(--ink)]")}>
                {kp.value}
              </div>
              <div className="mt-1.5 text-[11px] text-[var(--muted)]">{kp.sub}</div>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mb-9 grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Panel title="Evolução mensal" hint="licitações (barras) e valor (linha)">
            <ComboChart data={tend} />
          </Panel>
        </Reveal>
        <Reveal delay={0.05}>
          <Panel title="Como compram" hint="por modalidade">
            <Donut data={donut} />
          </Panel>
        </Reveal>
      </div>

      <div className="mb-9 grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Panel title="Órgãos que mais compram" hint="contas-alvo para esta marca">
            <ValueBars rows={orgaos} accent="fuchsia" />
          </Panel>
        </Reveal>
        <Reveal delay={0.05}>
          <Panel title="Distribuição por UF">
            <BrasilMap counts={ufCounts} />
          </Panel>
        </Reveal>
      </div>

      <h2 className="mb-3 text-base font-semibold text-[var(--ink)]">
        Licitações com {marca} <span className="text-sm font-normal text-[var(--muted)]">· mais recentes</span>
      </h2>
      {d.editais.length === 0 ? (
        <div className="card p-10 text-center text-[var(--muted)]">Nenhuma licitação encontrada.</div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {d.editais.map((r) => (
            <LicitacaoCard key={r.pncp_id} r={r} now={now} />
          ))}
        </div>
      )}
    </main>
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
