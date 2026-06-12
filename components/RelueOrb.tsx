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
            "radial-gradient(circle at 50% 50%, hsl(217 91% 60% / 0.65), hsl(262 83% 64% / 0.4) 45%, transparent 70%)",
          animation: `orb-pulse ${pulse} ease-in-out infinite`,
        }}
      />
      {/* corpo */}
      <div
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          boxShadow:
            "inset 0 0 30px rgba(255,255,255,0.25), inset -8px -12px 26px rgba(18,10,60,0.55), 0 10px 34px -6px hsl(243 80% 50% / 0.6)",
        }}
      >
        {/* gradiente iridescente girando */}
        <div
          className="absolute"
          style={{
            inset: "-30%",
            background:
              "conic-gradient(from 0deg, #3b82f6, #8b5cf6, #d946ef, #22d3ee, #6366f1, #3b82f6)",
            animation: `orb-spin ${spin} linear infinite`,
            filter: "blur(7px)",
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
