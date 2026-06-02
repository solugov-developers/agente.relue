"use client";

import dynamic from "next/dynamic";

export type { OrbState } from "./RelueOrb";

// WebGL só no cliente
const Orb = dynamic(() => import("./RelueOrb"), { ssr: false, loading: () => null });

export default Orb;
