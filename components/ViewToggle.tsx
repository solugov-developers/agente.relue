"use client";

import { LayoutGrid, List } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function ViewToggle() {
  const router = useRouter();
  const sp = useSearchParams();
  const path = usePathname();
  const view = sp.get("view") === "lista" ? "lista" : "cards";

  const set = (v: "cards" | "lista") => {
    const p = new URLSearchParams(sp.toString());
    if (v === "cards") p.delete("view");
    else p.set("view", v);
    router.push(path + (p.toString() ? "?" + p.toString() : ""));
  };

  const opts: { v: "cards" | "lista"; label: string; Icon: typeof LayoutGrid }[] = [
    { v: "cards", label: "Cards", Icon: LayoutGrid },
    { v: "lista", label: "Lista", Icon: List },
  ];

  return (
    <div className="inline-flex rounded-full border border-[var(--line)] bg-white p-0.5 text-xs">
      {opts.map(({ v, label, Icon }) => (
        <button
          key={v}
          onClick={() => set(v)}
          className={
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition " +
            (view === v ? "bg-[var(--brand)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]")
          }
        >
          <Icon size={13} /> {label}
        </button>
      ))}
    </div>
  );
}
