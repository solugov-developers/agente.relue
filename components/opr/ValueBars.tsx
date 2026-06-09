"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export type ValueRow = { label: string; value: number; sub?: string };

const compact = (x: number) => {
  if (!x) return "—";
  if (x >= 1e9) return "R$ " + (x / 1e9).toFixed(2) + " bi";
  if (x >= 1e6) return "R$ " + (x / 1e6).toFixed(0) + " mi";
  if (x >= 1e3) return "R$ " + (x / 1e3).toFixed(0) + "k";
  return "R$ " + x.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
};

export default function ValueBars({ rows, accent = "violet", linkBase }: { rows: ValueRow[]; accent?: "violet" | "fuchsia"; linkBase?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const fill = accent === "fuchsia" ? "#c026d3" : "#7c3aed";
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.label} className="text-sm">
          <div className="mb-1 flex items-center justify-between gap-3">
            {linkBase ? (
              <Link href={linkBase + encodeURIComponent(r.label)} className="truncate text-[var(--ink-soft)] hover:text-[var(--brand)] hover:underline" title={r.label}>
                {r.label}
              </Link>
            ) : (
              <span className="truncate text-[var(--ink-soft)]" title={r.label}>
                {r.label}
              </span>
            )}
            <span className="num shrink-0 font-semibold text-[var(--ink)]">{compact(r.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--line-soft)]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(r.value / max) * 100}%` }}
              transition={{ duration: 0.7, delay: 0.05 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full"
              style={{ background: fill }}
            />
          </div>
          {r.sub && <div className="mt-0.5 text-[11px] text-[var(--muted)]">{r.sub}</div>}
        </div>
      ))}
    </div>
  );
}
