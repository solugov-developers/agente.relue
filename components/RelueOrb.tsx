"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

export type OrbState = "idle" | "listening" | "thinking";

function Particles({ state }: { state: OrbState }) {
  const ref = useRef<THREE.Points>(null);
  const N = 2800;

  const { positions, colors, base } = useMemo(() => {
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const c1 = new THREE.Color("#5b8cff"); // azul
    const c2 = new THREE.Color("#9d6bff"); // violeta
    const c3 = new THREE.Color("#43e7ff"); // ciano
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = Math.PI * (3 - Math.sqrt(5)) * i;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      const m = (y + 1) / 2;
      const c = (m < 0.5 ? c1.clone().lerp(c3, m * 2) : c2.clone().lerp(c1, (m - 0.5) * 2));
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return { positions: pos, colors: col, base: pos.slice() };
  }, []);

  useFrame((st, dt) => {
    const p = ref.current;
    if (!p) return;
    const d = Math.min(dt, 0.05);
    const speed = state === "thinking" ? 1.0 : state === "listening" ? 0.5 : 0.2;
    p.rotation.y += d * speed;
    p.rotation.x += d * speed * 0.25;
    const t = st.clock.elapsedTime;
    const amp = state === "thinking" ? 0.09 : state === "listening" ? 0.045 : 0.022;
    const arr = (p.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const f = 1 + amp * Math.sin(t * 2.2 + base[i] * 4 + base[i + 1] * 5);
      arr[i] = base[i] * f;
      arr[i + 1] = base[i + 1] * f;
      arr[i + 2] = base[i + 2] * f;
    }
    (p.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    p.scale.setScalar(1 + 0.035 * Math.sin(t * 1.5));
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.022}
        vertexColors
        transparent
        opacity={0.95}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

export default function RelueOrb({ state = "idle" }: { state?: OrbState }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.7], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <Particles state={state} />
      <EffectComposer>
        <Bloom
          intensity={1.25}
          luminanceThreshold={0.12}
          luminanceSmoothing={0.5}
          radius={0.75}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
