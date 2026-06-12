import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import CommandChat from "@/components/CommandChat";
import Sidebar from "@/components/Sidebar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Relue — Inteligência de Licitações de TI · Solugov",
  description: "Inteligência de mercado sobre licitações públicas de TI (base PNCP)",
};

export const viewport = {
  themeColor: "#09090c",
  colorScheme: "dark" as const,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${newsreader.variable} h-full antialiased dark`}>
      <body className="min-h-full p-0 lg:p-3">
        <div className="app-shell min-h-[100dvh] lg:min-h-[calc(100dvh-1.5rem)]">
          <Sidebar />
          <div className="relative z-10 min-w-0 pb-24 lg:pb-0 lg:pl-[84px]">{children}</div>
        </div>
        <CommandChat />
      </body>
    </html>
  );
}
