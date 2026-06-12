"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Table2, Tags, DollarSign, Activity, LogOut, type LucideIcon } from "lucide-react";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Início", icon: Home },
  { href: "/painel", label: "Painel", icon: LayoutGrid },
  { href: "/licitacoes", label: "Licitações", icon: Table2 },
  { href: "/marcas", label: "Fabricantes", icon: Tags },
  { href: "/precos", label: "Preços", icon: DollarSign },
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
      {/* rail vertical — desktop (dentro do shell) */}
      <aside className="fixed left-5 top-5 bottom-5 z-40 hidden w-[58px] flex-col items-center lg:flex">
        <Link href="/" aria-label="Relue" className="text-[15px] font-bold tracking-tight text-[var(--ink)]">
          Relue
        </Link>
        <div className="mt-4 h-px w-7 bg-[var(--line)]" />

        <nav className="mt-5 flex flex-col items-center gap-2.5">
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
                  "grid h-10 w-10 place-items-center rounded-full transition active:scale-95 " +
                  (active ? "dock-floating-active" : "dock-floating")
                }
              >
                <Icon size={17} strokeWidth={2} />
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <button
          onClick={logout}
          title={user ? `Sair (${primeiro || user.email})` : "Sair"}
          aria-label="Sair"
          className="dock-floating mb-3 grid h-10 w-10 place-items-center rounded-full text-[var(--muted)] hover:text-[var(--neg)]"
        >
          <LogOut size={16} strokeWidth={2} />
        </button>
        {user && (
          <div
            title={`${user.nome || user.email}`}
            className="grid h-10 w-10 place-items-center rounded-full text-sm font-semibold text-white ring-2 ring-white/10"
            style={{ background: "linear-gradient(135deg, hsl(194 74% 38%), hsl(202 70% 46%))" }}
          >
            {initial}
          </div>
        )}
      </aside>

      {/* dock inferior — mobile */}
      <nav
        className="surface-frost fixed inset-x-3 z-40 flex items-center justify-around rounded-[26px] px-2 py-2 shadow-[0_12px_32px_-8px_hsl(240_50%_1%/0.7)] lg:hidden"
        style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
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
                "grid h-10 w-10 place-items-center rounded-full transition " +
                (active ? "dock-floating-active" : "text-[var(--ink-soft)] active:scale-95")
              }
            >
              <Icon size={18} strokeWidth={2} />
            </Link>
          );
        })}
        <button
          onClick={logout}
          aria-label="Sair"
          className="grid h-10 w-10 place-items-center rounded-full text-[var(--muted)] active:scale-95"
        >
          <LogOut size={17} strokeWidth={2} />
        </button>
      </nav>
    </>
  );
}
