"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MessageSquareText } from "lucide-react";

const SUG = ["Resuma este edital", "O que está sendo comprado?", "Vale a pena? riscos e pontos de atenção"];

export default function EditalAsk({ pncpId }: { pncpId: string }) {
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [asked, setAsked] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setInput("");
    setAsked(text);
    setAnswer("");
    setBusy(true);
    try {
      const res = await fetch("/api/edital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pncpId, question: text }),
      });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += dec.decode(value, { stream: true });
        setAnswer(full);
        endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } catch (e) {
      setAnswer("Erro: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--blue)]">
          <MessageSquareText size={14} />
        </span>
        <h3 className="font-semibold text-[var(--ink)]">Pergunte ao Relue sobre este edital</h3>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {SUG.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            disabled={busy}
            className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs text-[var(--ink-soft)] ring-1 ring-[var(--line)] transition hover:bg-white/[0.1] hover:text-[var(--brand)] disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex.: quais itens têm maior valor?"
          className="h-10 flex-1 rounded-full border border-[var(--line)] bg-white/[0.06] px-4 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
        />
        <button
          disabled={busy || !input.trim()}
          className="rounded-full bg-[var(--brand)] px-5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-40"
        >
          Enviar
        </button>
      </form>

      {(asked || answer) && (
        <div className="mt-4 border-t border-[var(--line-soft)] pt-4">
          {asked && <div className="mb-2 text-sm font-medium text-[var(--ink-soft)]">“{asked}”</div>}
          {answer ? (
            <div className="md text-sm text-[var(--ink)]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
            </div>
          ) : (
            <span className="text-sm text-[var(--muted)]">analisando o edital…</span>
          )}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
}
