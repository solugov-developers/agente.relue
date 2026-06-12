"use client";

import { useRef, useState } from "react";

/* Avatar do agente Relue — retrato low-poly com moldura sci-fi:
 * anel teal rotativo, halo luminoso, tilt 3D seguindo o mouse, scanline e
 * tint holográfico ao passar o mouse. */
export default function RelueAvatar({
  size = 124,
  state = "idle",
  className = "",
}: {
  size?: number;
  state?: "idle" | "thinking";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState(false);
  const spin = state === "thinking" ? "4.5s" : "13s";

  function move(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setT({ x: -py * 18, y: px * 18 });
  }
  function leave() {
    setHover(false);
    setT({ x: 0, y: 0 });
  }

  return (
    <div
      className={"relative shrink-0 " + className}
      style={{ width: size, height: size, perspective: 700 }}
    >
      {/* halo luminoso */}
      <div
        className="pointer-events-none absolute inset-[-16%] rounded-full blur-2xl transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, hsl(186 95% 55% / 0.85), hsl(194 80% 42% / 0.4) 48%, transparent 72%)",
          opacity: hover ? 1 : 0.5,
          animation: `orb-pulse ${state === "thinking" ? "1.6s" : "4.5s"} ease-in-out infinite`,
        }}
      />
      {/* wrapper com tilt 3D */}
      <div
        ref={ref}
        onMouseEnter={() => setHover(true)}
        onMouseMove={move}
        onMouseLeave={leave}
        className="relative h-full w-full rounded-full transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${t.x}deg) rotateY(${t.y}deg) scale(${hover ? 1.05 : 1})`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* anel rotativo */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, #0c4254, #167591, #2ba6c8, #8fe3f0, #ffffff, #1a87a4, #0c4254)",
            animation: `orb-spin ${spin} linear infinite`,
            filter: hover ? "brightness(1.25) saturate(1.3)" : "brightness(0.95)",
            boxShadow: hover
              ? "0 0 30px -2px hsl(190 95% 55% / 0.7)"
              : "0 0 14px -4px hsl(194 80% 45% / 0.4)",
            transition: "filter 0.3s ease, box-shadow 0.3s ease",
          }}
        />
        {/* retrato */}
        <div
          className="absolute inset-[2.5px] overflow-hidden rounded-full"
          style={{
            boxShadow: hover
              ? "inset 0 0 26px hsl(190 95% 60% / 0.45)"
              : "inset 0 0 18px hsl(200 50% 3% / 0.6)",
            transition: "box-shadow 0.3s ease",
          }}
        >
          <div
            className="absolute inset-0 bg-cover"
            style={{ backgroundImage: "url(/relue-avatar.png)", backgroundPosition: "50% 30%" }}
          />
          {/* tint holográfico */}
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              background:
                "linear-gradient(180deg, hsl(186 95% 55% / 0.16), transparent 38%, hsl(198 80% 30% / 0.2))",
              mixBlendMode: "screen",
              opacity: hover ? 1 : 0.55,
            }}
          />
          {/* scanline no hover */}
          {hover && (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
              style={{
                background:
                  "linear-gradient(180deg, transparent, hsl(185 100% 72% / 0.4), transparent)",
                animation: "scan 1.3s linear infinite",
              }}
            />
          )}
          {/* borda interna */}
          <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/10" />
        </div>
      </div>
    </div>
  );
}
