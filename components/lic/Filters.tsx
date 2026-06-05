"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Facets = {
  ufs: { uf: string; n: string }[];
  subs: { subcategoria: string; n: string }[];
  mods: { modalidade_nome: string; n: string }[];
};

export default function Filters({ facets }: { facets: Facets }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const [qv, setQv] = useState(sp.get("q") ?? "");

  const status = sp.get("status") ?? "todas";
  const ordem = sp.get("ordem") ?? "recente";
  const uf = sp.get("uf") ?? "";
  const sub = sp.get("sub") ?? "";
  const mod = sp.get("mod") ?? "";

  function setParam(patch: Record<string, string | undefined>) {
    const p = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    if (!("page" in patch)) p.delete("page"); // qualquer filtro volta pra pág. 1
    startTransition(() => router.push(pathname + (p.toString() ? "?" + p.toString() : "")));
  }

  // busca textual com debounce
  useEffect(() => {
    const t = setTimeout(() => {
      if ((sp.get("q") ?? "") !== qv) setParam({ q: qv || undefined });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qv]);

  const activeCount = [uf, sub, mod, status === "abertas" ? "x" : "", qv].filter(Boolean).length;

  const sel =
    "h-9 rounded-full border border-[var(--line)] bg-white px-3.5 text-sm text-[var(--ink-soft)] outline-none transition focus:border-[var(--brand)] hover:border-[var(--brand)]/50";

  return (
    <div className="card mb-5 p-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* busca */}
        <div className="relative min-w-[240px] flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">⌕</span>
          <input
            value={qv}
            onChange={(e) => setQv(e.target.value)}
            placeholder="Buscar por objeto, órgão ou município…"
            className="h-9 w-full rounded-full border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[var(--brand)]"
          />
        </div>

        {/* abertas / todas */}
        <div className="flex rounded-lg border border-[var(--line)] bg-white/60 p-0.5 text-xs">
          {[
            ["todas", "Todas"],
            ["abertas", "Só abertas"],
          ].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setParam({ status: v === "todas" ? undefined : v })}
              className={
                "rounded-md px-3 py-1.5 font-medium transition " +
                ((status === v || (v === "todas" && status !== "abertas"))
                  ? "bg-[var(--brand)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--ink)]")
              }
            >
              {label}
            </button>
          ))}
        </div>

        <select className={sel} value={sub} onChange={(e) => setParam({ sub: e.target.value || undefined })}>
          <option value="">Segmento (todos)</option>
          {facets.subs.map((s) => (
            <option key={s.subcategoria} value={s.subcategoria}>
              {s.subcategoria} ({s.n})
            </option>
          ))}
        </select>

        <select className={sel} value={uf} onChange={(e) => setParam({ uf: e.target.value || undefined })}>
          <option value="">UF (todas)</option>
          {facets.ufs.map((u) => (
            <option key={u.uf} value={u.uf}>
              {u.uf} ({u.n})
            </option>
          ))}
        </select>

        <select className={sel} value={mod} onChange={(e) => setParam({ mod: e.target.value || undefined })}>
          <option value="">Modalidade (todas)</option>
          {facets.mods.map((m) => (
            <option key={m.modalidade_nome} value={m.modalidade_nome}>
              {m.modalidade_nome} ({m.n})
            </option>
          ))}
        </select>

        <select className={sel} value={ordem} onChange={(e) => setParam({ ordem: e.target.value })}>
          <option value="recente">Mais recentes</option>
          <option value="prazo">Prazo de encerramento</option>
          <option value="score">Maior score</option>
          <option value="valor">Maior valor</option>
        </select>

        {activeCount > 0 && (
          <button
            onClick={() => {
              setQv("");
              startTransition(() => router.push(pathname));
            }}
            className="h-9 rounded-lg px-3 text-xs font-medium text-[var(--brand)] hover:bg-[var(--brand-soft)]"
          >
            Limpar ({activeCount})
          </button>
        )}
      </div>
    </div>
  );
}
