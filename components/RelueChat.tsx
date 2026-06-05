"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type M = { role: "user" | "assistant"; content: string; sql?: string };

const GROUPS: { tema: string; perguntas: string[] }[] = [
  {
    tema: "Mercado",
    perguntas: [
      "Top 10 marcas de software mais compradas",
      "Ticket mediano por segmento de TI",
      "Quais órgãos mais compram TI?",
    ],
  },
  {
    tema: "Oportunidades",
    perguntas: [
      "Oportunidades de ERP abertas com maior valor",
      "Licitações de segurança da informação abertas em SP",
      "Maiores oportunidades abertas com score acima de 85",
    ],
  },
  {
    tema: "Tendências",
    perguntas: [
      "Evolução das licitações de TI nos últimos 12 meses",
      "Distribuição de licitações por UF",
      "Quais estados mais compram Microsoft?",
    ],
  },
];

export default function RelueChat() {
  const [msgs, setMsgs] = useState<M[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function send(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    const history = msgs.filter((m) => m.content); // trocas anteriores (memória de conversa)
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

  return (
    <div className="flex h-[100dvh] flex-col">
      {/* header */}
      <header className="surface-frost flex items-center gap-3 border-b px-6 py-4">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-base text-white shadow-[0_6px_16px_-6px_hsl(262_83%_50%/0.7)]">
          ✦
        </span>
        <div>
          <div className="text-sm font-semibold text-[var(--ink)]">Relue · Analista de Inteligência</div>
          <div className="text-xs text-[var(--muted)]">
            {busy ? "consultando a base de licitações…" : "pergunte em linguagem natural — eu consulto o PNCP"}
          </div>
        </div>
        {msgs.length > 0 && (
          <button
            onClick={() => setMsgs([])}
            className="ml-auto rounded-lg bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-medium text-[var(--brand)] hover:brightness-95"
          >
            Nova conversa
          </button>
        )}
      </header>

      {/* conversa */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto w-full max-w-3xl">
          {empty ? (
            <div className="pt-6">
              <h2 className="font-display text-[34px] font-semibold leading-tight text-[var(--ink)]">
                Olá, sou o <span className="text-gradient-primary">Relue</span>.
              </h2>
              <p className="mt-2 max-w-xl text-[var(--muted)]">
                Sua inteligência de mercado sobre licitações públicas de TI. Pergunte sobre marcas, tickets,
                oportunidades abertas, órgãos ou tendências — eu transformo em consulta e te respondo com dados.
              </p>
              <div className="mt-7 space-y-5">
                {GROUPS.map((g) => (
                  <div key={g.tema}>
                    <div className="label mb-2">{g.tema}</div>
                    <div className="flex flex-wrap gap-2">
                      {g.perguntas.map((p) => (
                        <button
                          key={p}
                          onClick={() => send(p)}
                          className="card px-3.5 py-2 text-left text-[13px] text-[var(--ink-soft)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {msgs.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      "max-w-[88%] rounded-2xl px-4 py-2.5 text-sm " +
                      (m.role === "user"
                        ? "bg-[var(--brand)] text-white"
                        : "card text-[var(--ink)]")
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
                        <pre className="num mt-1 whitespace-pre-wrap rounded-lg bg-black/5 p-2">{m.sql}</pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>
      </div>

      {/* composer */}
      <div className="border-t border-[var(--line)] bg-white/40 px-4 py-4 backdrop-blur-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mx-auto flex w-full max-w-3xl items-end gap-2"
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
            placeholder="Pergunte ao Relue…  (Enter envia · Shift+Enter quebra linha)"
            className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--brand)]"
          />
          <button
            disabled={busy || !input.trim()}
            className="h-[44px] rounded-xl bg-[var(--brand)] px-5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-40"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
