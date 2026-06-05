"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function MarcaSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [, start] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => {
      start(() => router.push(v.trim() ? `/marcas?q=${encodeURIComponent(v.trim())}` : "/marcas"));
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  return (
    <div className="relative max-w-md">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">⌕</span>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Buscar fabricante (Microsoft, Autodesk, SAP…)"
        className="h-10 w-full rounded-full border border-[var(--line)] bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[var(--brand)]"
      />
    </div>
  );
}
