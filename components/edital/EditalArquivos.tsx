"use client";

import { useEffect, useState } from "react";
import { FileText, ExternalLink } from "lucide-react";

type Arquivo = { titulo?: string; tipoDocumentoNome?: string; url?: string; uri?: string };

const cleanTitulo = (t?: string) => {
  if (!t) return "Documento";
  try {
    return decodeURIComponent(t).replace(/_/g, " ");
  } catch {
    return t.replace(/_/g, " ");
  }
};

export default function EditalArquivos({
  cnpj,
  ano,
  seq,
  link,
}: {
  cnpj: string;
  ano: string;
  seq: string;
  link?: string;
}) {
  const [arqs, setArqs] = useState<Arquivo[] | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch(`/api/arquivos?cnpj=${cnpj}&ano=${ano}&seq=${seq}`)
      .then((r) => r.json())
      .then((d) => !cancel && setArqs(Array.isArray(d) ? d : []))
      .catch(() => !cancel && setArqs([]));
    return () => {
      cancel = true;
    };
  }, [cnpj, ano, seq]);

  if (arqs === null) return <p className="text-xs text-[var(--muted)]">carregando arquivos…</p>;

  // PNCP bloqueia o IP do servidor -> link direto (abre do navegador do usuário)
  if (arqs.length === 0)
    return link ? (
      <a
        href={link}
        target="_blank"
        rel="noreferrer"
        className="group flex items-center gap-2.5 rounded-xl bg-[var(--line-soft)] p-2.5 transition hover:bg-[var(--blue-soft)]"
      >
        <ExternalLink size={16} className="shrink-0 text-[var(--blue)]" />
        <span className="text-[13px] font-medium text-[var(--ink-soft)] group-hover:text-[var(--blue)]">
          Ver documentos no PNCP
        </span>
      </a>
    ) : (
      <p className="text-xs text-[var(--muted)]">Documentos disponíveis no portal do PNCP.</p>
    );

  return (
    <ul className="space-y-1.5">
      {arqs.map((a, i) => (
        <li key={i}>
          <a
            href={a.url ?? a.uri}
            target="_blank"
            rel="noreferrer"
            className="group flex items-start gap-2.5 rounded-xl bg-[var(--line-soft)] p-2.5 transition hover:bg-[var(--brand-soft)]"
          >
            <FileText size={16} className="mt-0.5 shrink-0 text-[var(--brand)]" />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-[var(--ink-soft)] group-hover:text-[var(--brand)]">
                {cleanTitulo(a.titulo)}
              </div>
              {a.tipoDocumentoNome && <div className="text-[11px] text-[var(--muted)]">{a.tipoDocumentoNome}</div>}
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
