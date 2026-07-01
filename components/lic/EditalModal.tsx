"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, ExternalLink, MapPin, CalendarDays, CalendarClock } from "lucide-react";
import EditalAsk from "@/components/edital/EditalAsk";
import EditalArquivos from "@/components/edital/EditalArquivos";

type Item = {
  numero_item: number | null;
  descricao: string | null;
  quantidade: string | null;
  unidade_medida: string | null;
  valor_unitario_estimado: string | null;
  valor_total: string | null;
};
type Detalhe = { lic: Record<string, unknown>; itens: Item[]; marcas: string[] };

const n = (v: unknown) => (v == null ? 0 : Number(v));
const brl = (v: unknown) => (v == null ? "—" : "R$ " + n(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 }));
const brl0 = (v: unknown) => (v == null ? "—" : "R$ " + n(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 }));
const fmt = (s: unknown) =>
  !s ? "—" : new Date(String(s)).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
const ESFERA: Record<string, string> = { M: "Municipal", E: "Estadual", F: "Federal", D: "Distrital", N: "—" };

export default function EditalModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [data, setData] = useState<Detalhe | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  // fecha com ESC + trava o scroll do fundo enquanto aberto
  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [id, onClose]);

  useEffect(() => {
    if (!id) {
      setData(null);
      setErro("");
      return;
    }
    setLoading(true);
    setErro("");
    setData(null);
    const ctrl = new AbortController();
    fetch(`/api/edital-detalhe?id=${encodeURIComponent(id)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("não encontrado"))))
      .then((d: Detalhe) => setData(d))
      .catch((e) => e.name !== "AbortError" && setErro("Não consegui carregar este edital."))
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [id]);

  if (!id) return null;

  const l = data?.lic ?? {};
  const itens = data?.itens ?? [];
  const marcas = data?.marcas ?? [];
  const somaItens = itens.reduce((s, it) => s + n(it.valor_total), 0);
  const aberta = l.data_encerramento_proposta ? new Date(String(l.data_encerramento_proposta)).getTime() >= Date.now() : false;
  const direta = !l.data_encerramento_proposta && /dispensa|inexig/i.test(String(l.modalidade_nome ?? ""));

  const info = [
    { label: "Valor estimado", value: brl0(l.valor_total_estimado), accent: true },
    { label: "Modalidade", value: String(l.modalidade_nome ?? "—") },
    { label: "Esfera", value: ESFERA[String(l.esfera_id)] ?? "—" },
    { label: "Publicação", value: fmt(l.data_publicacao_pncp) },
    { label: "Abertura das propostas", value: l.data_abertura_proposta ? fmt(l.data_abertura_proposta) : "—" },
    { label: "Encerramento", value: direta ? "Contratação direta" : fmt(l.data_encerramento_proposta) },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-3 md:p-6" role="dialog" aria-modal>
      {/* backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* painel */}
      <div className="relative z-[101] my-2 w-full max-w-[1080px] rounded-2xl border border-[var(--line)] bg-[hsl(240_12%_7%)] shadow-2xl">
        {/* barra superior fixa */}
        <div className="surface-frost sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-2xl border-b border-[var(--line)] px-5 py-3">
          <span className="text-[13px] font-medium text-[var(--muted)]">Detalhe do edital</span>
          <div className="flex items-center gap-2">
            <Link
              href={`/edital?id=${encodeURIComponent(id)}`}
              className="hidden rounded-full px-3 py-1.5 text-[12px] text-[var(--muted)] ring-1 ring-[var(--line)] transition hover:text-[var(--brand)] sm:inline-block"
            >
              Abrir em página
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="grid h-8 w-8 place-items-center rounded-full text-[var(--muted)] transition hover:bg-white/[0.08] hover:text-[var(--ink)]"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 md:px-7">
          {loading && <div className="p-14 text-center text-sm text-[var(--muted)]">Carregando…</div>}
          {erro && <div className="p-14 text-center text-sm text-[var(--muted)]">{erro}</div>}

          {data && (
            <>
              {/* header */}
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={"badge inline-flex items-center gap-1.5 px-2.5 py-1 " + (aberta ? "bg-emerald-400/15 text-emerald-300" : "bg-white/[0.07] text-[var(--muted)]")}>
                  <span className={"h-1.5 w-1.5 rounded-full " + (aberta ? "bg-emerald-400" : "bg-white/30")} />
                  {aberta ? "Aberta" : direta ? "Contratação direta" : "Encerrada / sem prazo"}
                </span>
                {l.subcategoria != null && <span className="badge bg-violet-400/15 text-violet-300">{String(l.subcategoria)}</span>}
                {l.score_oportunidade != null && (
                  <span className="num badge bg-violet-400/20 text-violet-200" title="Score de oportunidade (0–100) da IA">
                    score {String(l.score_oportunidade)}
                  </span>
                )}
              </div>
              <h1 className="text-[19px] font-bold leading-snug tracking-tight text-[var(--ink)] md:text-[22px]">
                {String(l.resumo || (l.objeto_compra ? String(l.objeto_compra).slice(0, 120) + (String(l.objeto_compra).length > 120 ? "…" : "") : "Edital"))}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-[var(--muted)]">
                <span className="font-medium text-[var(--ink-soft)]">{String(l.orgao_entidade ?? "—")}</span>
                {l.municipio || l.uf ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={13} className="opacity-60" /> {[l.municipio, l.uf].filter(Boolean).join(", ")}
                  </span>
                ) : null}
                <span className="num inline-flex items-center gap-1.5">
                  <CalendarDays size={13} className="opacity-60" /> publicado {fmt(l.data_publicacao_pncp)}
                </span>
                {l.data_abertura_proposta ? (
                  <span className="num inline-flex items-center gap-1.5">
                    <CalendarClock size={13} className="opacity-60" /> abertura {fmt(l.data_abertura_proposta)}
                  </span>
                ) : null}
              </div>

              {/* KPIs */}
              <div className="mt-5 mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                {info.map((it) => (
                  <div key={it.label} className="card p-4">
                    <div className="label">{it.label}</div>
                    <div className={"mt-1.5 text-[14px] font-bold leading-tight " + (it.accent ? "num text-gradient-primary text-lg" : "text-[var(--ink)]")}>
                      {it.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* objeto */}
              {l.objeto_compra ? (
                <details className="card mb-4 p-5">
                  <summary className="label cursor-pointer list-none">Objeto da contratação</summary>
                  <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-[var(--ink-soft)]">
                    {String(l.objeto_compra)}
                  </p>
                </details>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-3">
                {/* itens */}
                <div className="lg:col-span-2">
                  <div className="card overflow-hidden p-0">
                    <div className="flex items-baseline justify-between gap-2 border-b border-[var(--line)] px-5 py-3.5">
                      <h3 className="font-semibold text-[var(--ink)]">Itens do edital</h3>
                      <span className="text-xs text-[var(--muted)]">{itens.length} itens · soma {brl0(somaItens)}</span>
                    </div>
                    {itens.length === 0 ? (
                      <div className="p-10 text-center text-sm text-[var(--muted)]">Sem itens carregados para este edital.</div>
                    ) : (
                      <div className="max-h-[420px] overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="surface-frost sticky top-0">
                            <tr className="label border-b border-[var(--line)] text-left">
                              <th className="w-10 px-4 py-2.5 text-center font-medium">#</th>
                              <th className="px-3 py-2.5 font-medium">Descrição</th>
                              <th className="px-3 py-2.5 text-right font-medium">Qtd</th>
                              <th className="px-3 py-2.5 text-right font-medium">Unit.</th>
                              <th className="px-4 py-2.5 text-right font-medium">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itens.map((it, i) => (
                              <tr key={i} className="border-b border-[var(--line-soft)] align-top">
                                <td className="num px-4 py-2.5 text-center text-[var(--muted)]">{it.numero_item ?? i + 1}</td>
                                <td className="px-3 py-2.5 leading-snug text-[var(--ink-soft)]">{it.descricao ?? "—"}</td>
                                <td className="num px-3 py-2.5 text-right text-[var(--muted)]">
                                  {n(it.quantidade).toLocaleString("pt-BR")}
                                  {it.unidade_medida ? <span className="text-[10px]"> {it.unidade_medida}</span> : null}
                                </td>
                                <td className="num px-3 py-2.5 text-right text-[var(--ink-soft)]">{brl(it.valor_unitario_estimado)}</td>
                                <td className="num px-4 py-2.5 text-right font-medium text-[var(--ink)]">{brl0(it.valor_total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* ações + arquivos + marcas */}
                <div className="space-y-4">
                  <div className="card p-5">
                    {l.link != null && (
                      <a
                        href={String(l.link)}
                        target="_blank"
                        rel="noreferrer"
                        className="mb-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                      >
                        Abrir no PNCP <ExternalLink size={14} />
                      </a>
                    )}

                    {marcas.length > 0 && (
                      <div className="mb-4">
                        <div className="label mb-1.5">Fabricantes citados</div>
                        <div className="flex flex-wrap gap-1.5">
                          {marcas.slice(0, 12).map((m) => (
                            <Link
                              key={m}
                              href={`/marcas?m=${encodeURIComponent(m)}`}
                              className="badge bg-violet-400/15 capitalize text-violet-300 hover:bg-violet-400/25"
                            >
                              {m}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="label mb-1.5">Arquivos do edital</div>
                    <EditalArquivos
                      cnpj={String(l.cnpj_orgao ?? "")}
                      ano={String(l.ano_compra ?? "")}
                      seq={String(l.sequencial_compra ?? "")}
                      link={l.link ? String(l.link) : undefined}
                    />
                  </div>
                </div>
              </div>

              {/* perguntar à IA */}
              <div className="mt-4">
                <EditalAsk pncpId={String(l.pncp_id)} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
