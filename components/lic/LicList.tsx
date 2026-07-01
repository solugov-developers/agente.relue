"use client";

import { useState } from "react";
import type { LicRow } from "@/lib/licitacoes";
import LicitacaoCard from "./LicitacaoCard";
import EditalModal from "./EditalModal";

// Renderiza a grade e abre o detalhe num popup — a lista fica montada por trás,
// então a posição de rolagem, filtros e página são preservados ao fechar.
export default function LicList({ rows, now }: { rows: LicRow[]; now: number }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((r) => (
          <LicitacaoCard key={r.pncp_id} r={r} now={now} onOpen={setSelected} />
        ))}
      </div>
      <EditalModal id={selected} onClose={() => setSelected(null)} />
    </>
  );
}
