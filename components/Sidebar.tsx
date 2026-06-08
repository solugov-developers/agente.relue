"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Table2, Tags, DollarSign, Sparkles, Activity, LogOut, type LucideIcon } from "lucide-react";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Visão geral", icon: LayoutGrid },
  { href: "/licitacoes", label: "Licitações", icon: Table2 },
  { href: "/marcas", label: "Fabricantes", icon: Tags },
  { href: "/precos", label: "Preços", icon: DollarSign },
  { href: "/relue", label: "Relue IA", icon: Sparkles },
  { href: "/sync", label: "Sync", icon: Activity },
];

export default function Sidebar() {
  const path = usePathname();
  const isActive = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (path === "/login") return null;

  return (
    <>
      {/* dock flutuante — desktop */}
      <aside className="fixed left-3 top-3 bottom-3 z-40 hidden w-14 flex-col items-center lg:flex">
        <Link
          href="/"
          aria-label="Relue"
          className="dock-floating grid h-11 w-11 place-items-center rounded-2xl text-base font-bold text-[var(--brand)]"
        >
          R
        </Link>

        <div className="flex-1" />

        <nav className="flex flex-col items-center gap-1.5">
          {NAV.map((n) => {
            const active = isActive(n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                title={n.label}
                aria-label={n.label}
                aria-current={active ? "page" : undefined}
                className={
                  "group relative grid h-11 w-11 place-items-center rounded-2xl " +
                  (active ? "dock-floating-active" : "dock-floating")
                }
              >
                <Icon size={18} strokeWidth={2} />
                {active && (
                  <span
                    aria-hidden
                    className="absolute -right-1.5 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-[var(--brand)] shadow-[0_0_10px_hsl(262_83%_58%/0.6)]"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <button
          onClick={logout}
          title="Sair"
          aria-label="Sair"
          className="dock-floating grid h-11 w-11 place-items-center rounded-2xl text-[var(--muted)] hover:text-[var(--neg)]"
        >
          <LogOut size={17} strokeWidth={2} />
        </button>
      </aside>

      {/* topo — mobile */}
      <div className="surface-frost sticky top-0 z-40 flex items-center gap-1 px-3 py-2.5 lg:hidden">
        <Link href="/" className="mr-1 grid h-8 w-8 place-items-center rounded-xl bg-[var(--brand)] text-sm font-bold text-white">
          R
        </Link>
        {NAV.map((n) => {
          const active = isActive(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={
                "rounded-lg px-3 py-1.5 text-xs font-medium transition " +
                (active ? "bg-[var(--ink)] text-white" : "text-[var(--ink-soft)] hover:text-[var(--brand)]")
              }
            >
              {n.label}
            </Link>
          );
        })}
        <button onClick={logout} title="Sair" className="ml-auto rounded-lg px-2.5 py-1.5 text-[var(--ink-soft)] hover:text-[var(--neg)]">
          <LogOut size={16} />
        </button>
      </div>
    </>
  );
}
