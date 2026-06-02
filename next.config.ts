import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // raiz correta (há um package-lock.json solto em ~ que confunde o Turbopack)
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
