import Link from "next/link";
import { listFacets, listLicitacoes, type LicFilters } from "@/lib/licitacoes";
import Filters from "@/components/lic/Filters";
import PageHeader from "@/components/PageHeader";
import LicitacaoCard from "@/components/lic/LicitacaoCard";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Licitacoes({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const get = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) || undefined;
  };

  const f: LicFilters = {
    q: get("q"),
    uf: get("uf"),
    sub: get("sub"),
    mod: get("mod"),
    status: get("status") ?? "todas",
    ordem: get("ordem") ?? "recente",
    page: Number(get("page") ?? 1) || 1,
    pageSize: 24,
  };

  const [{ rows, total, page, pageSize }, facets] = await Promise.all([listLicitacoes(f), listFacets()]);
  const pages = Math.max(Math.ceil(total / pageSize), 1);

  const mkHref = (p: number) => {
    const u = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => {
      if (k === "page") return;
      const val = Array.isArray(v) ? v[0] : v;
      if (val) u.set(k, val);
    });
    if (p > 1) u.set("page", String(p));
    return "/licitacoes" + (u.toString() ? "?" + u.toString() : "");
  };

  const now = Date.now();

  return (
    <main className="mx-auto max-w-[1360px] px-5 py-8 md:px-8">
      <PageHeader
        kicker="Base de Oportunidades"
        title="Licitações de TI"
        subtitle={`${total.toLocaleString("pt-BR")} processos · busque, filtre e abra o edital direto no PNCP`}
      />

      <Filters facets={facets} />

      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-sm text-[var(--muted)]">
          <b className="num text-[var(--ink-soft)]">{total.toLocaleString("pt-BR")}</b> resultado{total === 1 ? "" : "s"}
        </span>
        {pages > 1 && <span className="text-xs text-[var(--muted)]">página {page} de {pages}</span>}
      </div>

      {rows.length === 0 ? (
        <div className="card p-14 text-center text-[var(--muted)]">
          Nenhuma licitação encontrada com esses filtros.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((r) => (
            <LicitacaoCard key={r.pncp_id} r={r} now={now} />
          ))}
        </div>
      )}

      {/* paginação */}
      {pages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm text-[var(--muted)]">
          <span>
            Página {page} de {pages} · {total.toLocaleString("pt-BR")} resultados
          </span>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={mkHref(page - 1)}
                className="rounded-full bg-white/[0.06] px-4 py-2 ring-1 ring-[var(--line)] transition hover:bg-white/[0.1] hover:text-[var(--brand)]"
              >
                ← Anterior
              </Link>
            )}
            {page < pages && (
              <Link
                href={mkHref(page + 1)}
                className="rounded-full bg-white/[0.06] px-4 py-2 ring-1 ring-[var(--line)] transition hover:bg-white/[0.1] hover:text-[var(--brand)]"
              >
                Próxima →
              </Link>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
