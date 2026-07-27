"use client";

import Link from "next/link";
import { MapPin, CalendarDays, CalendarClock, CalendarCheck, ExternalLink, ArrowUpRight } from "lucide-react";
import type { LicRow } from "@/lib/licitacoes";

const SUB_COLOR: Record<string, string> = {
  "ERP/Gestão": "bg-violet-400/15 text-violet-300",
  "Licenças/Software de prateleira": "bg-purple-400/15 text-purple-300",
  "Cloud/Infraestrutura": "bg-indigo-400/15 text-indigo-300",
  "Suporte/Manutenção de TI": "bg-slate-400/15 text-slate-300",
  "Segurança da Informação": "bg-fuchsia-400/15 text-fuchsia-300",
  "Desenvolvimento de Software": "bg-violet-400/20 text-violet-200",
  "BI/Dados/IA": "bg-sky-400/15 text-sky-300",
  "Telecom/Redes": "bg-cyan-400/15 text-cyan-300",
  Outro: "bg-white/[0.07] text-[var(--muted)]",
};

const brl = (v: string | null) =>
  v == null ? null : "R$ " + Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 });

const fmtDate = (s: string | null) =>
  !s ? null : new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

function deadline(enc: string | null, now: number, modalidade?: string | null) {
  if (!enc) {
    if (/dispensa|inexig/i.test(modalidade ?? ""))
      return { label: "Contratação direta", cls: "bg-white/[0.07] text-[var(--ink-soft)]", dot: "bg-white/30" };
    return { label: "Sem prazo definido", cls: "bg-white/[0.07] text-[var(--muted)]", dot: "bg-white/30" };
  }
  const t = new Date(enc).getTime();
  if (t < now) return { label: "Encerrada", cls: "bg-white/[0.05] text-[var(--muted)]", dot: "bg-white/20" };
  const dias = Math.ceil((t - now) / 86400000);
  if (dias === 0) return { label: "Encerra hoje", cls: "bg-red-400/15 text-red-300", dot: "bg-red-400" };
  if (dias === 1) return { label: "Encerra amanhã", cls: "bg-amber-400/15 text-amber-300", dot: "bg-amber-400" };
  if (dias <= 7) return { label: `Encerra em ${dias} dias`, cls: "bg-amber-400/15 text-amber-300", dot: "bg-amber-400" };
  return { label: `${dias} dias restantes`, cls: "bg-emerald-400/15 text-emerald-300", dot: "bg-emerald-400" };
}

function identificador(r: LicRow) {
  const m = (r.modalidade_nome ?? "Licitação").split(" ")[0].toUpperCase();
  const seq = r.pncp_id?.split("-").pop()?.split("/")[0] ?? "";
  return [m, seq && r.data_publicacao_pncp ? `${seq}` : ""].filter(Boolean).join(" ");
}

export default function LicitacaoCard({
  r,
  now,
  onOpen,
}: {
  r: LicRow;
  now: number;
  onOpen?: (id: string) => void;
}) {
  const dl = deadline(r.data_encerramento_proposta, now, r.modalidade_nome);
  const valor = brl(r.valor_total_estimado);
  const score = r.score_oportunidade == null ? null : Number(r.score_oportunidade);

  return (
    <article className="card flex h-full flex-col p-6">
      {/* topo: prazo + score */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={"badge inline-flex items-center gap-1.5 px-2.5 py-1 " + dl.cls}>
          <span className={"h-1.5 w-1.5 rounded-full " + dl.dot} />
          {dl.label}
        </span>
        {r.subcategoria && (
          <span className={"badge " + (SUB_COLOR[r.subcategoria] ?? "bg-white/[0.07] text-[var(--muted)]")}>
            {r.subcategoria}
          </span>
        )}
        {score != null && (
          <span
            title="Score de oportunidade (0–100) que a IA atribuiu na triagem"
            className={
              "num badge ml-auto inline-flex items-center gap-1 " +
              (score >= 80
                ? "bg-violet-400/20 text-violet-200"
                : score >= 60
                  ? "bg-indigo-400/15 text-indigo-300"
                  : "bg-white/[0.07] text-[var(--muted)]")
            }
          >
            score {score}
          </span>
        )}
      </div>

      {/* identificador + órgão */}
      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2.5">
        <span className="num text-[12px] font-semibold tracking-tight text-[var(--ink-soft)]">
          {identificador(r)}
        </span>
        <span className="text-[13px] text-[var(--muted)]">{r.orgao_entidade}</span>
      </div>

      {/* objeto */}
      <p className="line-clamp-2 text-[15px] leading-relaxed text-[var(--ink)]">
        {r.resumo || r.objeto_compra || "—"}
      </p>

      {/* datas: publicação × abertura */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[var(--muted)]">
        {(r.municipio || r.uf) && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={13} className="opacity-60" strokeWidth={2} />
            {[r.municipio, r.uf].filter(Boolean).join(", ")}
          </span>
        )}
        {r.data_publicacao_pncp && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} className="opacity-60" strokeWidth={2} />
            <span className="text-[var(--muted)]/80">Publicação</span>
            <span className="num text-[var(--ink-soft)]">{fmtDate(r.data_publicacao_pncp)}</span>
          </span>
        )}
        {r.data_abertura_proposta && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock size={13} className="opacity-60" strokeWidth={2} />
            <span className="text-[var(--muted)]/80">Abertura</span>
            <span className="num text-[var(--ink-soft)]">{fmtDate(r.data_abertura_proposta)}</span>
          </span>
        )}
        {r.data_encerramento_proposta && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarCheck size={13} className="opacity-60" strokeWidth={2} />
            <span className="text-[var(--muted)]/80">Encerramento</span>
            <span className="num text-[var(--ink-soft)]">{fmtDate(r.data_encerramento_proposta)}</span>
          </span>
        )}
      </div>

      <div className="mt-2 text-right">
        <span className="num">
          {valor ? (
            <span className="text-[15px] font-semibold text-[var(--ink)]">{valor}</span>
          ) : (
            <span className="text-[12px] text-[var(--muted)]/70">valor não informado</span>
          )}
        </span>
      </div>

      {/* rodapé */}
      <div className="mt-5 flex items-center justify-between gap-2 border-t border-[var(--line-soft)] pt-4">
        {onOpen ? (
          <button
            type="button"
            onClick={() => onOpen(r.pncp_id)}
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--ink-soft)] transition hover:text-[var(--brand)]"
          >
            Ver detalhe <ArrowUpRight size={13} />
          </button>
        ) : (
          <Link
            href={`/edital?id=${encodeURIComponent(r.pncp_id)}`}
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--ink-soft)] transition hover:text-[var(--brand)]"
          >
            Ver detalhe <ArrowUpRight size={13} />
          </Link>
        )}
        {r.link ? (
          <a
            href={r.link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand)] px-3.5 py-1.5 text-[12.5px] font-semibold text-white shadow-[0_4px_12px_-4px_hsl(262_83%_50%/0.6)] transition hover:brightness-110"
          >
            Abrir no PNCP
            <ExternalLink size={12} />
          </a>
        ) : (
          <span className="text-xs text-[var(--muted)]">sem link</span>
        )}
      </div>
    </article>
  );
}
