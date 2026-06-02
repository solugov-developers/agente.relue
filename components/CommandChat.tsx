"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Orb, { type OrbState } from "./Orb";

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
  const [orb, setOrb] = useState<OrbState>("idle");
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
      const q = (e as CustomEvent).detail?.question as string | undefined;
      if (q) setTimeout(() => send(q), 80);
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
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, orb]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || orb === "thinking") return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setOrb("thinking");
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
          try { meta = JSON.parse(full.slice(0, nl)); } catch { meta = {}; }
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
      setOrb("idle");
    }
  }

  return (
    <>
      {/* botão flutuante */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir Relue"
        className="glow-blue fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 animate-pulse-soft"
      >
        <span className="text-xl">✦</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[10vh] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="glass flex max-h-[78vh] w-full max-w-2xl flex-col overflow-hidden"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3">
                <div className="h-9 w-9">
                  <Orb state={orb} />
                </div>
                <div>
                  <div className="text-sm font-semibold">Relue</div>
                  <div className="text-xs text-zinc-500">
                    {orb === "thinking" ? "analisando…" : "pergunte qualquer coisa sobre as licitações de TI"}
                  </div>
                </div>
                <kbd className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-400">esc</kbd>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {msgs.length === 0 && (
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLES.map((e) => (
                      <button
                        key={e}
                        onClick={() => send(e)}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
                {msgs.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "text-right" : ""}>
                    <div
                      className={
                        "inline-block max-w-full rounded-2xl px-3.5 py-2 text-sm " +
                        (m.role === "user" ? "bg-blue-600/80 text-white" : "bg-white/5 text-zinc-100")
                      }
                    >
                      {m.role === "assistant" ? (
                        m.content ? (
                          <div className="md">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <span className="text-zinc-500">…</span>
                        )
                      ) : (
                        m.content
                      )}
                      {m.sql && (
                        <details className="mt-2 text-[11px] text-zinc-500">
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
                className="flex gap-2 border-t border-white/10 p-3"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pergunte ao Relue…"
                  className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                <button
                  disabled={orb === "thinking"}
                  className="rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Enviar
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
