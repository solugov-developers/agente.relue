"use client";

export type Kpi = { label: string; value: string; sub?: string; accent?: boolean };

export default function TopBar({ kpis, updatedAt }: { kpis: Kpi[]; updatedAt: string }) {
  const ask = () => window.dispatchEvent(new CustomEvent("relue-open"));
  return (
    <header className="glass-dark sticky top-0 z-30 border-b border-white/10">
      <div className="mx-auto flex h-16 max-w-[1440px] items-stretch gap-5 px-5 text-white">
        <div className="flex flex-col justify-center pr-1">
          <div className="text-[11px] font-semibold tracking-[0.32em] text-blue-300">RELUE</div>
          <div className="-mt-0.5 text-[11px] text-white/50">Inteligência de Mercado</div>
        </div>

        <div className="hidden flex-1 items-center gap-6 overflow-x-auto lg:flex">
          {kpis.map((k) => (
            <div key={k.label} className="flex flex-col justify-center border-l border-white/10 pl-6">
              <div className="text-[10px] uppercase tracking-wide text-white/45">{k.label}</div>
              <div
                className={"num text-lg font-semibold leading-tight " + (k.accent ? "text-amber-300" : "")}
              >
                {k.value}
              </div>
              {k.sub && <div className="text-[10px] text-white/40">{k.sub}</div>}
            </div>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-4">
          <span className="hidden text-[11px] text-white/40 xl:block">atualizado {updatedAt}</span>
          <button
            onClick={ask}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
          >
            <span className="text-blue-300">✦</span>
            <span className="hidden sm:inline">Pergunte ao Relue</span>
            <kbd className="num rounded bg-white/15 px-1.5 py-0.5 text-[10px] text-white/60">⌘K</kbd>
          </button>
        </div>
      </div>
    </header>
  );
}
