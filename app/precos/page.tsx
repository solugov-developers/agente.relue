import Link from "next/link";
import { searchPrecos, benchmarkList } from "@/lib/precos";
import PageHeader from "@/components/PageHeader";
import PrecoSearch from "@/components/precos/PrecoSearch";

export const dynamic = "force-dynamic";

const n = (v: unknown) => (v == null ? 0 : Number(v));
const brl = (v: unknown) =>
  v == null ? "—" : "R$ " + n(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (s: string | null) =>
  !s ? "—" : new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Precos({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const pick = (k: string) => {
    const x = sp[k];
    return (Array.isArray(x) ? x[0] : x) || "";
  };
  const term = pick("q");
  const sub = pick("sub");

  const { stats, rows } = term ? await searchPrecos(term, sub) : { stats: null, rows: [] };
  const bench = term ? [] : await benchmarkList();
  const hasResult = !!stats && n(stats.n) > 0;

  return (
    <main className="mx-auto max-w-[1360px] px-5 py-8 md:px-8">
      <PageHeader
        kicker="Channel · Inteligência de Preços"
        title="Benchmark de preços"
        subtitle="Preço unitário praticado pelo governo por produto/serviço — base de 41 mil itens de editais."
      />

      <div className="card mb-6 p-4">
        <PrecoSearch initial={term} sub={sub} />
      </div>

      {!term ? (
        <>
          <h2 className="mb-3 text-base font-semibold text-[var(--ink)]">
            Benchmarks populares <span className="text-sm font-normal text-[var(--muted)]">· preço unitário praticado</span>
          </h2>
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="label border-b border-[var(--line)] text-left">
                    <th className="px-4 py-3 font-medium">Produto / serviço</th>
                    <th className="px-3 py-3 text-right font-medium">Itens</th>
                    <th className="px-3 py-3 text-right font-medium">Preço mediano</th>
                    <th className="px-3 py-3 text-right font-medium">Preço médio</th>
                    <th className="px-4 py-3 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {bench.map((b) => (
                    <tr key={b.label} className="border-b border-[var(--line-soft)] hover:bg-white/50">
                      <td className="px-4 py-3">
                        <Link href={`/precos?q=${encodeURIComponent(b.q)}`} className="font-medium text-[var(--ink)] hover:text-[var(--brand)]">
                          {b.label}
                        </Link>
                      </td>
                      <td className="num px-3 py-3 text-right text-[var(--muted)]">{n(b.n).toLocaleString("pt-BR")}</td>
                      <td className="num px-3 py-3 text-right font-semibold text-[var(--ink)]">
                        {b.mediana != null ? brl(b.mediana) : "—"}
                      </td>
                      <td className="num px-3 py-3 text-right text-[var(--ink-soft)]">
                        {b.media != null ? brl(b.media) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/precos?q=${encodeURIComponent(b.q)}`} className="text-xs font-medium text-[var(--brand)] hover:underline">
                          ver itens →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Ou busque qualquer produto/serviço no campo acima para ver a faixa de preços detalhada.
          </p>
        </>
      ) : !hasResult ? (
        <div className="card p-14 text-center text-[var(--muted)]">
          Nenhum item com preço encontrado para <b className="text-[var(--ink-soft)]">“{term}”</b>. Tente outro termo.
        </div>
      ) : (
        <>
          {/* estatísticas */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Preço mediano", value: brl(stats!.mediana), accent: true },
              { label: "Preço médio", value: brl(stats!.media) },
              { label: "Menor", value: brl(stats!.minv) },
              { label: "Maior", value: brl(stats!.maxv) },
            ].map((s) => (
              <div key={s.label} className="card p-4">
                <div className="label">{s.label}</div>
                <div className={"num mt-1.5 text-xl font-bold " + (s.accent ? "text-gradient-primary" : "text-[var(--ink)]")}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
          <p className="mb-3 text-sm text-[var(--muted)]">
            <b className="text-[var(--ink-soft)]">{n(stats!.n).toLocaleString("pt-BR")}</b> itens encontrados para “{term}”
            {sub ? <> no segmento <b className="text-[var(--ink-soft)]">{sub}</b></> : null} · preço unitário estimado
          </p>

          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="label border-b border-[var(--line)] text-left">
                    <th className="px-4 py-3 font-medium">Item</th>
                    <th className="px-3 py-3 text-right font-medium">Qtd</th>
                    <th className="px-3 py-3 text-right font-medium">Preço unit.</th>
                    <th className="px-3 py-3 font-medium">Órgão</th>
                    <th className="px-4 py-3 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-[var(--line-soft)] align-top hover:bg-white/50">
                      <td className="max-w-[440px] px-4 py-3">
                        <a
                          href={r.link ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="line-clamp-2 text-[13px] leading-snug text-[var(--ink-soft)] hover:text-[var(--brand)]"
                        >
                          {r.descricao ?? "—"}
                        </a>
                        {r.subcategoria && (
                          <span className="badge mt-1 inline-block bg-violet-50 text-violet-700">{r.subcategoria}</span>
                        )}
                      </td>
                      <td className="num px-3 py-3 text-right text-[var(--muted)]">
                        {n(r.quantidade).toLocaleString("pt-BR")}
                        {r.unidade_medida ? <span className="text-[10px]"> {r.unidade_medida}</span> : null}
                      </td>
                      <td className="num px-3 py-3 text-right font-semibold text-[var(--ink)]">
                        {brl(r.valor_unitario_estimado)}
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--ink-soft)]">
                        <div className="max-w-[220px] truncate">{r.orgao_entidade ?? "—"}</div>
                        <div className="text-[var(--muted)]">{r.uf ?? ""}</div>
                      </td>
                      <td className="num px-4 py-3 text-xs text-[var(--muted)]">{fmtDate(r.data_publicacao_pncp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
