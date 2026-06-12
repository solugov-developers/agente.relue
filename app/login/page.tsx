"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowRight } from "lucide-react";
import InstallPrompt from "@/components/InstallPrompt";

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.replace(next.startsWith("/login") ? "/" : next);
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setErr(d.error || "Não foi possível entrar.");
      }
    } catch {
      setErr("Falha de conexão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ambient fixed inset-0 overflow-auto">
      <div className="grid min-h-full place-items-center px-5 py-10">
        <div className="w-full max-w-[380px]">
          {/* marca */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div
              className="h-[72px] w-[72px] overflow-hidden rounded-[20px] ring-1 ring-white/10 shadow-[0_12px_36px_-8px_hsl(194_80%_40%/0.55)]"
              style={{ backgroundImage: "url(/icon-192.png)", backgroundSize: "cover", backgroundPosition: "center" }}
            />
            <h1 className="mt-5 text-[26px] font-bold tracking-tight text-[var(--ink)]">Relue</h1>
            <p className="mt-1 text-[13px] text-[var(--muted)]">Inteligência de Licitações de TI · Solugov</p>
          </div>

          {/* card */}
          <div className="card p-6 sm:p-7">
            <h2 className="text-[17px] font-semibold text-[var(--ink)]">Bem-vindo de volta</h2>
            <p className="mb-6 mt-0.5 text-sm text-[var(--muted)]">Entre para acessar sua inteligência de mercado.</p>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label mb-1.5 block">E-mail</label>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@solugov.com"
                    autoComplete="username"
                    className="h-11 w-full rounded-xl border border-[var(--line)] bg-white/[0.05] pl-10 pr-4 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--blue)]/60 focus:bg-white/[0.07]"
                  />
                </div>
              </div>

              <div>
                <label className="label mb-1.5 block">Senha</label>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="h-11 w-full rounded-xl border border-[var(--line)] bg-white/[0.05] pl-10 pr-4 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--blue)]/60 focus:bg-white/[0.07]"
                  />
                </div>
              </div>

              {err && (
                <p className="rounded-lg border border-[var(--neg)]/30 bg-[var(--neg)]/10 px-3 py-2 text-sm text-[var(--neg)]">
                  {err}
                </p>
              )}

              <button
                disabled={busy || !email || !password}
                className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-[0_8px_24px_-6px_hsl(194_80%_40%/0.6)] transition hover:brightness-110 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, hsl(194 74% 40%), hsl(202 72% 48%))" }}
              >
                {busy ? "Entrando…" : "Entrar"}
                {!busy && <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />}
              </button>
            </form>
          </div>

          {/* instalar app */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <InstallPrompt />
            <p className="text-[11px] text-[var(--muted)]">acesso restrito à equipe Solugov</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
