"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Target, Tags, DollarSign } from "lucide-react";
import RelueAvatar from "@/components/RelueAvatar";

type M = { role: "user" | "assistant"; content: string; sql?: string };

const PILLS: { label: string; q: string }[] = [
  { label: "Oportunidades", q: "Maiores oportunidades abertas com score acima de 85" },
  { label: "Marcas", q: "Top 10 marcas de software mais compradas" },
  { label: "Preços", q: "Preço mediano praticado para Microsoft 365" },
  { label: "Tendências", q: "Evolução das licitações de TI nos últimos 12 meses" },
];

const CARDS: { icon: typeof Target; title: string; desc: string; q: string }[] = [
  { icon: Target, title: "Oportunidades em aberto", desc: "Abertas com maior score de oportunidade.", q: "Maiores oportunidades abertas com score acima de 85" },
  { icon: Tags, title: "Top fabricantes", desc: "Marcas mais demandadas pelo governo.", q: "Top 10 marcas de software mais compradas" },
  { icon: DollarSign, title: "Benchmark de preços", desc: "Preço praticado por produto/serviço.", q: "Ticket mediano por segmento de TI" },
];

const PLACEHOLDERS = [
  "Quais oportunidades de ERP estão abertas?",
  "Quanto o governo paga por Microsoft 365?",
  "Top fabricantes em segurança da informação",
  "Maiores licitações de TI abertas em SP",
  "Evolução das compras de nuvem nos últimos 12 meses",
];

export default function RelueChat() {
  const [msgs, setMsgs] = useState<M[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [nome, setNome] = useState("");
  const [phIdx, setPhIdx] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);
  useEffect(() => {
    const t = setInterval(() => setPhIdx((i) => (i + 1) % PLACEHOLDERS.length), 3400);
    return () => clearInterval(t);
  }, []);
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

  function pill(q: string) {
    setInput(q);
    inputRef.current?.focus();
  }

  const empty = msgs.length === 0;

  /* composer estilo LIX — strip superior + input + pills + send azul */
  const composer = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send(input);
      }}
      className="surface-frost mx-auto w-full max-w-2xl rounded-[24px] p-2 shadow-[0_24px_60px_-20px_hsl(240_50%_1%/0.8)]"
    >
      <div className="rounded-[18px] border border-[var(--line)] bg-black/30 p-2.5">
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
          placeholder={PLACEHOLDERS[phIdx]}
          className="max-h-40 min-h-[40px] w-full resize-none bg-transparent px-2 py-1.5 text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)] placeholder:transition-opacity"
        />
        <div className="mt-1 flex items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {PILLS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => pill(p.q)}
                className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--ink-soft)] transition hover:border-[var(--blue)]/50 hover:text-[var(--ink)]"
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            disabled={busy || !input.trim()}
            aria-label="Enviar"
            className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--blue)] text-white shadow-[0_6px_18px_-4px_hsl(194_80%_40%/0.7)] transition hover:brightness-110 disabled:opacity-40"
          >
            <ArrowUp size={19} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </form>
  );

  return (
    <div className="ambient">
      {empty ? (
        /* estado inicial — hero estilo LIX */
        <div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-5 py-10 lg:min-h-[calc(100dvh-1.5rem)]">
          <RelueAvatar size={132} state={busy ? "thinking" : "idle"} />
          <h2 className="mt-9 text-center text-[26px] font-medium leading-tight tracking-tight text-[var(--muted)] md:text-[30px]">
            Olá{nome ? `, ${nome}` : ""}
          </h2>
          <h1 className="mt-1 text-center text-[34px] font-bold leading-tight tracking-tight text-[var(--ink)] md:text-[46px]">
            Como posso ajudar hoje?
          </h1>
          <p className="mt-3 mb-9 max-w-md text-center text-[15px] leading-relaxed text-[var(--muted)]">
            Sua inteligência de licitações de TI — pergunte sobre marcas, oportunidades, preços ou tendências.
          </p>

          <div className="w-full">{composer}</div>

          <div className="mx-auto mt-4 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-3">
            {CARDS.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.title}
                  onClick={() => send(c.q)}
                  className="card group p-4 text-left transition hover:-translate-y-0.5"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--blue-soft)] text-[var(--blue)]">
                    <Icon size={16} />
                  </span>
                  <div className="mt-3 text-[13.5px] font-semibold text-[var(--ink)]">{c.title}</div>
                  <div className="mt-0.5 text-[12px] leading-snug text-[var(--muted)]">{c.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* conversa */
        <div className="flex min-h-[100dvh] flex-col lg:min-h-[calc(100dvh-1.5rem)]">
          <header className="flex items-center gap-3 px-6 py-4">
            <RelueAvatar size={38} state={busy ? "thinking" : "idle"} />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[var(--ink)]">Relue · Analista de Inteligência</div>
              <div className="text-xs text-[var(--muted)]">
                {busy ? "consultando a base de licitações…" : "pergunte em linguagem natural — eu consulto o PNCP"}
              </div>
            </div>
            <button
              onClick={() => setMsgs([])}
              className="ml-auto rounded-full border border-[var(--line)] px-3.5 py-1.5 text-xs font-medium text-[var(--ink-soft)] transition hover:border-[var(--blue)]/50 hover:text-[var(--ink)]"
            >
              Nova conversa
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="mx-auto w-full max-w-4xl space-y-4">
              {msgs.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      "rounded-2xl px-4 py-2.5 text-sm " +
                      (m.role === "user"
                        ? "max-w-[88%] bg-[var(--blue)] text-white"
                        : "w-full max-w-full card text-[var(--ink)]")
                    }
                  >
                    {m.role === "assistant" ? (
                      m.content ? (
                        <div className="md">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              table: ({ children }) => (
                                <div className="md-table">
                                  <table>{children}</table>
                                </div>
                              ),
                            }}
                          >
                            {m.content}
                          </ReactMarkdown>
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

          <div className="px-4 pb-6 pt-2">{composer}</div>
        </div>
      )}
    </div>
  );
}
