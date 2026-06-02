"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type M = { role: "user" | "assistant"; content: string; sql?: string };

const EXAMPLES = [
  "Top 10 marcas de software mais compradas",
  "Ticket mediano por subcategoria",
  "Top 10 órgãos que mais compram TI",
  "Quais oportunidades de ERP abertas com maior valor?",
  "Quantas licitações de Segurança da Informação por UF?",
];

export default function ChatPage() {
  const [msgs, setMsgs] = useState<M[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || loading) return;
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const d = await r.json();
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: d.answer || d.error || "(sem resposta)", sql: d.sql },
      ]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: "Erro: " + (e as Error).message }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 flex flex-col h-[calc(100vh-3.5rem)]">
      <h1 className="text-xl font-semibold mb-1">Pergunte ao analista</h1>
      <p className="text-sm text-zinc-400 mb-4">
        Consulta a base de licitações de TI (PNCP) em linguagem natural.
      </p>

      {msgs.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {EXAMPLES.map((e) => (
            <button
              key={e}
              onClick={() => send(e)}
              className="text-xs rounded-full border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <div
              className={
                "inline-block max-w-full rounded-2xl px-4 py-2.5 text-sm " +
                (m.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-800 text-zinc-100")
              }
            >
              {m.role === "assistant" ? (
                <div className="prose-table">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: (p) => (
                        <table className="my-2 w-full border-collapse text-xs" {...p} />
                      ),
                      th: (p) => (
                        <th className="border border-zinc-600 px-2 py-1 text-left bg-zinc-700/50" {...p} />
                      ),
                      td: (p) => <td className="border border-zinc-700 px-2 py-1" {...p} />,
                      a: (p) => <a className="text-emerald-400 underline" target="_blank" {...p} />,
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
              {m.sql && (
                <details className="mt-2 text-[11px] text-zinc-400">
                  <summary className="cursor-pointer">ver SQL</summary>
                  <pre className="mt-1 whitespace-pre-wrap">{m.sql}</pre>
                </details>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-sm text-zinc-500">analisando…</div>}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex: ticket mediano de Cloud por UF"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
        <button
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </main>
  );
}
