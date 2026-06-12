"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Sparkles } from "lucide-react";
import RelueOrb from "@/components/RelueOrb";

type M = { role: "user" | "assistant"; content: string; sql?: string };

const SUGGESTIONS: { label: string; q: string }[] = [
  { label: "Top 10 marcas mais compradas", q: "Top 10 marcas de software mais compradas" },
  { label: "Maiores oportunidades abertas (score 85+)", q: "Maiores oportunidades abertas com score acima de 85" },
  { label: "Ticket mediano por segmento de TI", q: "Ticket mediano por segmento de TI" },
  { label: "Evolução das licitações nos últimos 12 meses", q: "Evolução das licitações de TI nos últimos 12 meses" },
];

const PILLS = ["Oportunidades", "Marcas", "Tendências", "Preços"];

export default function RelueChat() {
  const [msgs, setMsgs] = useState<M[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [nome, setNome] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setNome((d.nome || "").split(" ")[0]))
      .catch(() => {});
  }, []);

  async function send(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    const history = msgs.filter((m) => m.content);
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, history }),
      });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let full = "";
      let meta: { sql?: string } | null = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += dec.decode(value, { stream: true });
        const nl = full.indexOf("\n");
        if (nl < 0) continue;
        if (!meta) {
          try {
            meta = JSON.parse(full.slice(0, nl));
          } catch {
            meta = {};
          }
        }
        const answer = full.slice(nl + 1);
        setMsgs((m) => {
          const c = [...m];
          c[c.length - 1] = { role: "assistant", content: answer, sql: meta?.sql };
          return c;
        });
      }
    } catch (e) {
      setMsgs((m) => {
        const c = [...m];
        c[c.length - 1] = { role: "assistant", content: "Erro: " + (e as Error).message };
        return c;
      });
    } finally {
      setBusy(false);
    }
  }

  const empty = msgs.length === 0;

  const composer = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send(input);
      }}
      className="surface-frost mx-auto flex w-full max-w-2xl items-end gap-2 rounded-[26px] p-2.5 shadow-[0_18px_50px_-16px_hsl(240_50%_2%/0.7)]"
    >
      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send(input);
          }
        }}
        rows={1}
        placeholder="Pergunte ao Relue…"
        className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
      />
      <button
        disabled={busy || !input.trim()}
        aria-label="Enviar"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white transition hover:brightness-110 disabled:opacity-40"
        style={{ background: "linear-gradient(135deg, hsl(217 91% 60%), hsl(262 83% 64%))" }}
      >
        <ArrowUp size={20} strokeWidth={2.4} />
      </button>
    </form>
  );

  return (
    <div className="ambient flex h-[100dvh] flex-col">
      {empty ? (
        /* estado vazio — hero estilo LIX */
        <div className="flex flex-1 flex-col items-center justify-center px-5 pb-8">
          <RelueOrb size={132} state={busy ? "thinking" : "idle"} />
          <h1 className="mt-8 text-center text-[34px] font-bold leading-tight tracking-tight text-[var(--ink)] md:text-[44px]">
            Olá{nome ? `, ${nome}` : ""} <span className="inline-block">👋</span>
          </h1>
          <p className="mt-2 mb-8 text-center text-[18px] text-[var(--muted)] md:text-[20px]">
            Como posso ajudar hoje?
          </p>

          <div className="w-full">{composer}</div>

          <div className="mx-auto mt-3 flex max-w-2xl flex-wrap justify-center gap-2">
            {PILLS.map((p) => (
              <span key={p} className="rounded-full bg-white/[0.06] px-3.5 py-1.5 text-xs text-[var(--ink-soft)] ring-1 ring-[var(--line)]">
                {p}
              </span>
            ))}
          </div>

          <div className="mx-auto mt-7 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.q}
                onClick={() => send(s.q)}
                className="card group flex items-center gap-3 p-4 text-left transition hover:-translate-y-0.5"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--blue-soft)] text-[var(--blue)]">
                  <Sparkles size={15} />
                </span>
                <span className="text-[13.5px] text-[var(--ink-soft)] group-hover:text-[var(--ink)]">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* conversa */
        <>
          <header className="surface-frost flex items-center gap-3 border-b px-6 py-3.5">
            <RelueOrb size={36} state={busy ? "thinking" : "idle"} />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[var(--ink)]">Relue · Analista de Inteligência</div>
              <div className="text-xs text-[var(--muted)]">
                {busy ? "consultando a base de licitações…" : "pergunte em linguagem natural — eu consulto o PNCP"}
              </div>
            </div>
            <button
              onClick={() => setMsgs([])}
              className="ml-auto rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-[var(--ink-soft)] ring-1 ring-[var(--line)] hover:bg-white/[0.1]"
            >
              Nova conversa
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto w-full max-w-3xl space-y-4">
              {msgs.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      "max-w-[88%] rounded-2xl px-4 py-2.5 text-sm " +
                      (m.role === "user" ? "text-white" : "card text-[var(--ink)]")
                    }
                    style={
                      m.role === "user"
                        ? { background: "linear-gradient(135deg, hsl(217 91% 58%), hsl(262 83% 62%))" }
                        : undefined
                    }
                  >
                    {m.role === "assistant" ? (
                      m.content ? (
                        <div className="md">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <span className="text-[var(--muted)]">analisando a base…</span>
                      )
                    ) : (
                      m.content
                    )}
                    {m.sql && (
                      <details className="mt-2 text-[11px] text-[var(--muted)]">
                        <summary className="cursor-pointer">ver SQL gerado</summary>
                        <pre className="num mt-1 whitespace-pre-wrap rounded-lg bg-white/5 p-2">{m.sql}</pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          </div>

          <div className="px-4 pb-5 pt-2">{composer}</div>
        </>
      )}
    </div>
  );
}
