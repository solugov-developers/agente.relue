"use client";

import { motion } from "framer-motion";
import Orb from "./Orb";

export type Kpi = { label: string; value: string; accent?: boolean };

export default function CommandDeck({ greeting, kpis }: { greeting: string; kpis: Kpi[] }) {
  const ask = (q?: string) =>
    window.dispatchEvent(new CustomEvent("relue-open", { detail: { question: q } }));

  return (
    <section className="relative">
      <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="text-grad text-sm font-semibold tracking-[0.3em] uppercase">Relue</div>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{greeting}</h1>
          <p className="mt-2 max-w-md text-sm text-zinc-400">
            Seu analista de inteligência de licitações de TI. Pergunte qualquer coisa sobre a base do PNCP.
          </p>
          <button
            onClick={() => ask()}
            className="glass glow-blue mt-5 flex items-center gap-3 rounded-full px-4 py-2.5 text-sm text-zinc-200 hover:text-white"
          >
            <span className="text-violet-300">✦</span>
            Pergunte ao Relue
            <kbd className="num rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-400">⌘K</kbd>
          </button>
        </motion.div>

        <motion.div
          className="h-44 w-44 cursor-pointer md:h-56 md:w-56"
          onClick={() => ask()}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <Orb state="idle" />
        </motion.div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            className={"glass p-4 " + (k.accent ? "glow-amber" : "")}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 + i * 0.06 }}
          >
            <div className={"num text-2xl font-bold " + (k.accent ? "text-amber-300" : "")}>{k.value}</div>
            <div className="mt-1 text-xs text-zinc-400">{k.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
