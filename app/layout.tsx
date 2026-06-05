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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${newsreader.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Sidebar />
        <div className="lg:pl-[78px]">{children}</div>
        <CommandChat />
      </body>
    </html>
  );
}
