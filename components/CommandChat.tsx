"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type M = { role: "user" | "assistant"; content: string; sql?: string };

const EXAMPLES = [
  "Top 10 marcas mais compradas",
  "Ticket mediano por subcategoria",
  "Oportunidades de ERP abertas com maior valor",
  "Quais órgãos compram Microsoft?",
];

export default function CommandChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<M[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onOpen(e: Event) {
      setOpen(true);
      const qd = (e as CustomEvent).detail?.question as string | undefined;
      if (qd) setTimeout(() => send(qd), 80);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("relue-open", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("relue-open", onOpen as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 160);
  }, [open]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
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

  return (
    <>
      {/* botão flutuante */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir Relue"
        className={
          "fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition hover:brightness-110 " +
          (open ? "pointer-events-none opacity-0" : "opacity-100")
        }
      >
        <span>✦</span> Relue
      </button>

      {/* painel lateral direito (CSS transform) */}
      <aside
        aria-hidden={!open}
        className={
          "glass-panel fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-white/40 shadow-[-12px_0_40px_-16px_rgba(16,24,40,0.3)] transition-transform duration-300 ease-out will-change-transform sm:w-[420px] " +
          (open ? "translate-x-0" : "pointer-events-none translate-x-full")
        }
      >
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">✦</span>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Relue</div>
            <div className="truncate text-xs text-[var(--muted)]">
              {busy ? "analisando a base…" : "inteligência de licitações de TI"}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {msgs.length > 0 && (
              <button
                onClick={() => setMsgs([])}
                title="Nova conversa"
                className="rounded-md px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--line-soft)]"
              >
                limpar
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--line-soft)]"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-transparent px-4 py-4">
          {msgs.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--ink-soft)]">
                Pergunte qualquer coisa sobre as licitações de TI do PNCP.
              </p>
              <div className="flex flex-col gap-2">
                {EXAMPLES.map((e) => (
                  <button
                    key={e}
                    onClick={() => send(e)}
                    className="card px-3 py-2 text-left text-xs text-[var(--ink-soft)] hover:border-[var(--brand)]"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <div
                className={
                  "inline-block max-w-full rounded-xl px-3.5 py-2 text-sm " +
                  (m.role === "user"
                    ? "bg-[var(--brand)] text-white"
                    : "border border-white/60 bg-white/80 text-[var(--ink)]")
                }
              >
                {m.role === "assistant" ? (
                  m.content ? (
                    <div className="md">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="text-[var(--muted)]">analisando…</span>
                  )
                ) : (
                  m.content
                )}
                {m.sql && (
                  <details className="mt-2 text-[11px] text-[var(--muted)]">
                    <summary className="cursor-pointer">ver SQL</summary>
                    <pre className="mt-1 whitespace-pre-wrap">{m.sql}</pre>
                  </details>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2 border-t border-white/40 bg-white/30 p-3"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte ao Relue…"
            className="flex-1 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
          />
          <button
            disabled={busy}
            className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Enviar
          </button>
        </form>
      </aside>
    </>
  );
}
