"use client";

import { motion } from "framer-motion";

export type Bar = { label: string; n: number };

export default function Bars({ rows, accent = "blue" }: { rows: Bar[]; accent?: "blue" | "amber" }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  const fill =
    accent === "amber"
      ? "linear-gradient(90deg,#ff8a3d,#ffb37a)"
      : "linear-gradient(90deg,#5b8cff,#9d6bff)";
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-40 shrink-0 truncate text-zinc-300">{r.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(r.n / max) * 100}%` }}
              transition={{ duration: 0.9, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full"
              style={{ background: fill }}
            />
          </div>
          <span className="num w-12 shrink-0 text-right text-zinc-400">
            {r.n.toLocaleString("pt-BR")}
          </span>
        </div>
      ))}
    </div>
  );
}
