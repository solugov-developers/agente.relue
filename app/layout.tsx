import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agente Relue — Inteligência de Licitações TI",
  description: "Analista de licitações de TI da Solugov (base PNCP)",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <nav className="border-b border-zinc-800 bg-zinc-900/40">
          <div className="mx-auto max-w-6xl px-6 h-14 flex items-center gap-6">
            <span className="font-semibold">🛰️ Agente Relue</span>
            <Link href="/" className="text-sm text-zinc-300 hover:text-white">
              Dashboard
            </Link>
            <Link href="/chat" className="text-sm text-zinc-300 hover:text-white">
              Pergunte ao analista
            </Link>
          </div>
        </nav>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
