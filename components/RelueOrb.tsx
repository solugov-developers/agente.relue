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
            "radial-gradient(circle at 50% 50%, hsl(214 100% 60% / 0.7), hsl(224 90% 56% / 0.4) 45%, transparent 70%)",
          animation: `orb-pulse ${pulse} ease-in-out infinite`,
        }}
      />
      {/* corpo */}
      <div
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          boxShadow:
            "inset 0 0 30px rgba(255,255,255,0.3), inset -8px -12px 28px rgba(8,16,50,0.6), 0 10px 38px -6px hsl(214 100% 52% / 0.6)",
        }}
      >
        {/* gradiente iridescente girando (azul dominante + raia quente — estilo LIX) */}
        <div
          className="absolute"
          style={{
            inset: "-30%",
            background:
              "conic-gradient(from 210deg, #1d4ed8, #3b82f6, #93c5fd, #ffffff, #f87171, #7c2d12, #1e3a8a, #2563eb, #1d4ed8)",
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
