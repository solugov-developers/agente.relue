"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  const [on, setOn] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => {
      router.refresh();
      setTick((x) => x + 1);
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [on, seconds, router]);

  return (
    <button
      onClick={() => setOn((o) => !o)}
      className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs ring-1 ring-[var(--line)]"
      title={on ? "Ao vivo (clique para pausar)" : "Pausado (clique para retomar)"}
    >
      <span className={"h-2 w-2 rounded-full " + (on ? "animate-pulse bg-emerald-400" : "bg-white/30")} />
      {on ? "ao vivo" : "pausado"}
      {on && <span className="num text-[var(--muted)]">· {tick}</span>}
    </button>
  );
}
