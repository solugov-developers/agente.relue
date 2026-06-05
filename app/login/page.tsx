"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
    <div className="fixed inset-0 grid place-items-center px-5">
      <div className="card w-full max-w-sm p-7">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand)] text-lg font-bold text-white shadow-[0_8px_20px_-8px_hsl(262_83%_50%/0.6)]">
            R
          </span>
          <div>
            <div className="text-[13px] font-semibold tracking-[0.26em] text-[var(--brand)]">RELUE</div>
            <div className="-mt-0.5 text-[11px] text-[var(--muted)]">Inteligência de Mercado · Solugov</div>
          </div>
        </div>

        <h1 className="text-lg font-semibold text-[var(--ink)]">Entrar</h1>
        <p className="mb-5 text-sm text-[var(--muted)]">Acesso restrito à equipe.</p>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e-mail"
            autoComplete="username"
            className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm outline-none focus:border-[var(--brand)]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="senha"
            autoComplete="current-password"
            className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm outline-none focus:border-[var(--brand)]"
          />
          {err && <p className="text-sm text-[var(--neg)]">{err}</p>}
          <button
            disabled={busy}
            className="h-11 w-full rounded-xl bg-[var(--brand)] text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>
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
