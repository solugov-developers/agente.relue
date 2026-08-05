import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // raiz correta (há um package-lock.json solto em ~ que confunde o Turbopack)
  turbopack: { root: import.meta.dirname },
  // node-unrar-js carrega o unrar.wasm irmão via __dirname — mantê-lo externo
  // impede o bundler de separá-lo do .wasm (senão quebra em produção).
  serverExternalPackages: ["node-unrar-js"],
};

export default nextConfig;
