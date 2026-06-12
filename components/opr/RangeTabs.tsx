"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const OPTS = [
  { v: "6", l: "6 meses" },
  { v: "12", l: "12 meses" },
  { v: "18", l: "18 meses" },
];

export default function RangeTabs() {
  const router = useRouter();
  const sp = useSearchParams();
  const path = usePathname();
  const cur = sp.get("range") ?? "12";

  function set(v: string) {
    const p = new URLSearchParams(sp.toString());
    if (v === "12") p.delete("range");
    else p.set("range", v);
    router.push(path + (p.toString() ? "?" + p.toString() : ""));
  }

  return (
    <div className="inline-flex rounded-full border border-[var(--line)] bg-white/[0.04] p-0.5 text-xs">
      {OPTS.map((o) => (
        <button
          key={o.v}
          onClick={() => set(o.v)}
          className={
            "rounded-full px-3 py-1.5 font-medium transition " +
            (cur === o.v ? "bg-[var(--blue)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]")
          }
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
