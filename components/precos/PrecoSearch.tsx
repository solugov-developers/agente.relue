"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const SEGMENTOS = [
  "ERP/Gestão",
  "Licenças/Software de prateleira",
  "Cloud/Infraestrutura",
  "Suporte/Manutenção de TI",
  "Segurança da Informação",
  "Desenvolvimento de Software",
  "BI/Dados/IA",
  "Telecom/Redes",
  "Outro",
];

const SUG = ["Microsoft 365", "antivírus", "ArcGIS", "firewall", "licença Windows", "ERP", "backup"];

export default function PrecoSearch({ initial, sub = "" }: { initial: string; sub?: string }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [seg, setSeg] = useState(sub);

  const go = (term: string, s = seg) => {
    const t = term.trim();
    if (!t) {
      router.push("/precos");
      return;
    }
    const p = new URLSearchParams({ q: t });
    if (s) p.set("sub", s);
    router.push(`/precos?${p.toString()}`);
  };

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(v);
        }}
        className="flex flex-wrap gap-2"
      >
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={v}
            onChange={(e) => setV(e.target.value)}
            placeholder="Descreva o produto/serviço (ex.: Zoom, antivírus, licença AutoCAD…)"
            className="h-11 w-full rounded-full border border-[var(--line)] bg-white/[0.06] pl-10 pr-4 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
          />
        </div>
        <select
          value={seg}
          onChange={(e) => {
            setSeg(e.target.value);
            if (v.trim()) go(v, e.target.value);
          }}
          className="h-11 rounded-full border border-[var(--line)] bg-white/[0.06] px-3.5 text-sm text-[var(--ink-soft)] outline-none focus:border-[var(--brand)] [&>option]:bg-[#15151c] [&>option]:text-[var(--ink)]"
          title="Filtrar por segmento (ajuda a separar, ex.: software de câmera)"
        >
          <option value="">Todos os segmentos</option>
          {SEGMENTOS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="rounded-full bg-[var(--brand)] px-5 text-sm font-medium text-white transition hover:brightness-110">
          Buscar
        </button>
      </form>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {SUG.map((s) => (
          <button
            key={s}
            onClick={() => {
              setV(s);
              go(s);
            }}
            className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-[var(--ink-soft)] ring-1 ring-[var(--line)] transition hover:bg-white/[0.1] hover:text-[var(--brand)]"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
