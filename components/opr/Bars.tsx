"use client";

import { motion } from "framer-motion";

export type Bar = { label: string; n: number };

export default function Bars({ rows, accent = "blue" }: { rows: Bar[]; accent?: "blue" | "amber" | "green" }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  const fill = accent === "amber" ? "#a855f7" : accent === "green" ? "#6d28d9" : "#7c3aed";
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-40 shrink-0 truncate text-[var(--ink-soft)]" title={r.label}>
            {r.label}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--line-soft)]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(r.n / max) * 100}%` }}
              transition={{ duration: 0.7, delay: 0.05 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full"
              style={{ background: fill }}
            />
          </div>
          <span className="num w-12 shrink-0 text-right text-[var(--ink-soft)]">
            {r.n.toLocaleString("pt-BR")}
          </span>
        </div>
      ))}
    </div>
  );
}
