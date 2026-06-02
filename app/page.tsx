import { getOpr } from "@/lib/opr";
import CommandDeck, { type Kpi } from "@/components/CommandDeck";
import Reveal from "@/components/opr/Reveal";
import Bars from "@/components/opr/Bars";
import TendenciaChart from "@/components/opr/TendenciaChart";
import BrasilMap from "@/components/opr/BrasilMap";

export const dynamic = "force-dynamic";

const n = (v: unknown) => (v == null ? 0 : Number(v));
const int = (v: unknown) => n(v).toLocaleString("pt-BR");
const brl = (v: unknown) =>
  v == null ? "—" : "R$ " + n(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const compactBRL = (v: unknown) => {
  const x = n(v);
  if (x >= 1e9) return "R$ " + (x / 1e9).toFixed(1) + "bi";
  if (x >= 1e6) return "R$ " + (x / 1e6).toFixed(1) + "mi";
  if (x >= 1e3) return "R$ " + (x / 1e3).toFixed(0) + "k";
  return brl(x);
};

function greet() {
  const h = new Date().getHours();
  const saud = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  return `${saud}, Euler 👋`;
}

export default async function OPR() {
  const d = await getOpr();
  const k = d.kpi ?? {};

  const kpis: Kpi[] = [
    { label: "Licitações de TI", value: int(k.total) },
    { label: "Oportunidades abertas", value: int(k.abertas), accent: true },
    { label: "Órgãos compradores", value: int(k.orgaos) },
    { label: "Score alto (80+)", value: int(k.alto) },
    { label: "Valor em jogo", value: compactBRL(k.valor) },
  ];

  const marcas = d.marcas.map((r) => ({ label: String(r.marca ?? "—"), n: n(r.n) }));
  const subs = d.subs.map((r) => ({ label: String(r.subcategoria ?? "—"), n: n(r.n) }));
  const orgaos = d.orgaos.map((r) => ({ label: String(r.orgao_entidade ?? "—"), n: n(r.n) }));
  const tendencia = d.tendencia.map((r) => ({ mes: String(r.mes), n: n(r.n) }));
  const ufCounts: Record<string, number> = {};
  d.ufs.forEach((r) => (ufCounts[String(r.uf)] = n(r.n)));

  return (
    <main className="relative z-10 mx-auto max-w-6xl px-5 py-8 md:py-12">
      <CommandDeck greeting={greet()} kpis={kpis} />

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {/* Oportunidades quentes — destaque */}
        <Reveal delay={0.05} className="lg:col-span-2">
          <Card title="🔥 Oportunidades quentes" hint="abertas, maior score — o filé pro comercial">
            <div className="space-y-2">
              {d.oportunidades.length === 0 && (
                <p className="text-sm text-zinc-500">Nenhuma com prazo aberto preenchido ainda (enriquecimento em curso).</p>
              )}
              {d.oportunidades.map((o) => (
                <a
                  key={String(o.pncp_id)}
                  href={String(o.link)}
                  target="_blank"
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 hover:border-amber-400/40"
                >
                  <span className="num grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-sm font-bold text-amber-300">
                    {int(o.score_oportunidade)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-zinc-200">{String(o.resumo ?? o.orgao_entidade)}</span>
                    <span className="block truncate text-xs text-zinc-500">
                      {String(o.orgao_entidade)} · {String(o.uf)} · {String(o.subcategoria)}
                    </span>
                  </span>
                  <span className="num shrink-0 text-sm text-amber-200">{brl(o.valor_total_estimado)}</span>
                </a>
              ))}
            </div>
          </Card>
        </Reveal>

        {/* Mapa */}
        <Reveal delay={0.1}>
          <Card title="🗺️ Distribuição por UF">
            <BrasilMap counts={ufCounts} />
          </Card>
        </Reveal>

        {/* Marcas */}
        <Reveal delay={0.15}>
          <Card title="🏷️ Marcas mais demandadas" hint="padronizado (v_marcas)">
            <Bars rows={marcas} />
          </Card>
        </Reveal>

        {/* Ticket mediano */}
        <Reveal delay={0.2}>
          <Card title="💰 Ticket mediano" hint="por subcategoria · n = com valor">
            <table className="w-full text-sm">
              <tbody>
                {d.ticket.map((r) => (
                  <tr key={String(r.subcategoria)} className="border-b border-white/5">
                    <td className="py-1.5 text-zinc-300">{String(r.subcategoria)}</td>
                    <td className="num py-1.5 text-right font-medium">{brl(r.mediana)}</td>
                    <td className="num py-1.5 pl-2 text-right text-xs text-zinc-500">n={int(r.n)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </Reveal>

        {/* Subcategorias */}
        <Reveal delay={0.25}>
          <Card title="📦 Por subcategoria">
            <Bars rows={subs} />
          </Card>
        </Reveal>

        {/* Tendência */}
        <Reveal delay={0.3} className="lg:col-span-2">
          <Card title="📈 Tendência (12 meses)" hint="licitações de TI publicadas por mês">
            <TendenciaChart data={tendencia} />
          </Card>
        </Reveal>

        {/* Órgãos */}
        <Reveal delay={0.35}>
          <Card title="🏛️ Contas-alvo" hint="órgãos que mais compram TI">
            <Bars rows={orgaos} accent="amber" />
          </Card>
        </Reveal>
      </div>

      <p className="mt-8 text-center text-xs text-zinc-600">
        Relue · base PNCP · cobertura de valor/prazo em enriquecimento contínuo
      </p>
    </main>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="glass h-full p-5">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mb-3 text-xs text-zinc-500">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </div>
  );
}
