"use client";

/* Orb iridescente da Relue IA — CSS puro (leve, sem WebGL).
 * state controla a velocidade da rotação/pulse. */
export default function RelueOrb({
  size = 120,
  state = "idle",
}: {
  size?: number;
  state?: "idle" | "thinking";
}) {
  const spin = state === "thinking" ? "5s" : "16s";
  const pulse = state === "thinking" ? "1.5s" : "3.6s";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden>
      {/* halo */}
      <div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, hsl(194 80% 50% / 0.7), hsl(198 70% 40% / 0.4) 45%, transparent 70%)",
          animation: `orb-pulse ${pulse} ease-in-out infinite`,
        }}
      />
      {/* corpo */}
      <div
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          boxShadow:
            "inset 0 0 30px rgba(255,255,255,0.3), inset -8px -12px 28px rgba(6,30,38,0.62), 0 10px 38px -6px hsl(194 80% 38% / 0.6)",
        }}
      >
        {/* gradiente iridescente girando (teal dominante + raia quente) */}
        <div
          className="absolute"
          style={{
            inset: "-30%",
            background:
              "conic-gradient(from 210deg, #0e4f63, #167591, #2596b8, #7fd6e6, #ffffff, #f0a868, #9a4a20, #0c4254, #1a7d99, #0e4f63)",
            animation: `orb-spin ${spin} linear infinite`,
            filter: "blur(8px)",
          }}
        />
        {/* brilho especular */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 34% 28%, rgba(255,255,255,0.75), transparent 40%)",
          }}
        />
      </div>
    </div>
  );
}
