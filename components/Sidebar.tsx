"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [user, setUser] = useState<{ nome: string; email: string } | null>(null);

  useEffect(() => {
    if (path === "/login") return;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUser({ nome: d.nome || "", email: d.email || "" }))
      .catch(() => {});
  }, [path]);

  const initial = (user?.nome || user?.email || "?").trim().charAt(0).toUpperCase();
  const primeiro = (user?.nome || "").split(" ")[0];

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
          className="grid h-11 w-11 place-items-center rounded-2xl text-base font-bold text-white shadow-[0_6px_18px_-4px_hsl(243_80%_55%/0.6)]"
          style={{ background: "linear-gradient(135deg, hsl(217 91% 60%), hsl(262 83% 64%))" }}
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
                    className="absolute -right-1.5 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-[var(--blue)] shadow-[0_0_12px_hsl(217_91%_60%/0.8)]"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {user && (
          <div
            title={`${user.nome || user.email}`}
            className="mb-1 grid h-9 w-9 place-items-center rounded-full text-sm font-semibold text-white shadow-[0_4px_12px_-2px_hsl(243_80%_55%/0.5)]"
            style={{ background: "linear-gradient(135deg, hsl(217 91% 58%), hsl(289 80% 60%))" }}
          >
            {initial}
          </div>
        )}
        <button
          onClick={logout}
          title={user ? `Sair (${primeiro || user.email})` : "Sair"}
          aria-label="Sair"
          className="dock-floating grid h-11 w-11 place-items-center rounded-2xl text-[var(--muted)] hover:text-[var(--neg)]"
        >
          <LogOut size={17} strokeWidth={2} />
        </button>
      </aside>

      {/* dock inferior — mobile (estilo Nixtio) */}
      <nav className="surface-frost fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-3xl px-2 py-2 shadow-[0_12px_32px_-8px_hsl(240_50%_2%/0.7)] lg:hidden">
        {NAV.map((n) => {
          const active = isActive(n.href);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-label={n.label}
              aria-current={active ? "page" : undefined}
              className={
                "grid h-11 w-11 place-items-center rounded-2xl transition " +
                (active ? "dock-floating-active" : "text-[var(--ink-soft)] active:scale-95")
              }
            >
              <Icon size={19} strokeWidth={2} />
            </Link>
          );
        })}
        <button
          onClick={logout}
          aria-label="Sair"
          className="grid h-11 w-11 place-items-center rounded-2xl text-[var(--muted)] active:scale-95"
        >
          <LogOut size={18} strokeWidth={2} />
        </button>
      </nav>
    </>
  );
}
