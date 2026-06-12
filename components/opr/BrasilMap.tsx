"use client";

import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { scaleSqrt } from "d3-scale";
import type { FeatureCollection } from "geojson";

export default function BrasilMap({ counts }: { counts: Record<string, number> }) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [hover, setHover] = useState<{ uf: string; n: number } | null>(null);

  useEffect(() => {
    fetch("/br-states.json")
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => {});
  }, []);

  const { paths, max } = useMemo(() => {
    if (!geo) return { paths: [] as { uf: string; d: string; n: number }[], max: 1 };
    const proj = geoMercator().fitSize([360, 380], geo);
    const path = geoPath(proj);
    const mx = Math.max(1, ...Object.values(counts));
    const ps = geo.features.map((f) => {
      const uf = String((f.properties as Record<string, unknown>)?.SIGLA ?? "");
      return { uf, d: path(f) ?? "", n: counts[uf] ?? 0 };
    });
    return { paths: ps, max: mx };
  }, [geo, counts]);

  const color = scaleSqrt<string, string>().domain([0, max]).range(["#1c1b2e", "#8b7bf0"]);

  return (
    <div className="relative">
      {!geo && <div className="py-16 text-center text-sm text-zinc-500">carregando mapa…</div>}
      <svg viewBox="0 0 360 380" className="h-auto w-full">
        {paths.map((p) => (
          <path
            key={p.uf}
            d={p.d}
            fill={color(p.n)}
            stroke="rgba(255,255,255,0.14)"
            strokeWidth={0.6}
            onMouseEnter={() => setHover({ uf: p.uf, n: p.n })}
            onMouseLeave={() => setHover(null)}
            className="cursor-default transition-opacity duration-150 hover:opacity-80"
          />
        ))}
      </svg>
      {hover && (
        <div className="card absolute right-2 top-2 px-3 py-1.5 text-xs">
          <b>{hover.uf}</b> · {hover.n.toLocaleString("pt-BR")} licitações
        </div>
      )}
    </div>
  );
}
