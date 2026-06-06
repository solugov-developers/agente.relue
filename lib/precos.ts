import { unstable_cache } from "next/cache";
import { q } from "./db";

export type PrecoItem = {
  descricao: string | null;
  quantidade: string | null;
  unidade_medida: string | null;
  valor_unitario_estimado: string | null;
  valor_total: string | null;
  orgao_entidade: string | null;
  uf: string | null;
  subcategoria: string | null;
  data_publicacao_pncp: string | null;
  link: string | null;
};

export const SEGMENTOS = [
  "ERP/Gestão",
  "Licenças/Software de prateleira",
  "Cloud/Infraestrutura",
  "Suporte/Manutenção de TI",
  "Segurança da Informação",
  "Desenvolvimento de Software",
  "BI/Dados/IA",
  "Telecom/Redes",
  "Outro",
];

// catálogo de benchmarks populares (produtos/serviços de TI mais comuns em editais)
const BENCH: { label: string; pat: string; q: string }[] = [
  { label: "Microsoft / Office 365", pat: "%microsoft%", q: "microsoft" },
  { label: "Office", pat: "%office%", q: "office" },
  { label: "Antivírus / Endpoint", pat: "%antiv%", q: "antivírus" },
  { label: "Firewall", pat: "%firewall%", q: "firewall" },
  { label: "AutoCAD", pat: "%autocad%", q: "autocad" },
  { label: "ArcGIS / Geoprocessamento", pat: "%arcgis%", q: "arcgis" },
  { label: "Licença Windows", pat: "%windows%", q: "windows" },
  { label: "Backup", pat: "%backup%", q: "backup" },
  { label: "ERP / Gestão", pat: "%erp%", q: "erp" },
  { label: "Hospedagem / Nuvem", pat: "%nuvem%", q: "nuvem" },
  { label: "Certificado digital", pat: "%certificado digital%", q: "certificado digital" },
  { label: "Help desk / Suporte", pat: "%help desk%", q: "help desk" },
];

// cacheado 30min — é igual p/ todos e a base muda 1x/dia (a query cruza 12 termos x ~43k itens)
export const benchmarkList = unstable_cache(
  async () => {
    const params: unknown[] = [];
    const values = BENCH.map((b) => {
      params.push(b.label, b.pat, b.q);
      return `($${params.length - 2}::text, $${params.length - 1}::text, $${params.length}::text)`;
    }).join(",");

    return q<{ label: string; q: string; n: string; mediana: string | null; media: string | null }>(
      `with termos(label, pat, q) as (values ${values})
       select t.label, t.q,
              count(i.descricao) n,
              percentile_cont(0.5) within group (order by i.valor_unitario_estimado) mediana,
              avg(i.valor_unitario_estimado) media
       from termos t
       left join public.licitacoes_itens i
         on i.descricao ilike t.pat and i.valor_unitario_estimado > 0 and i.valor_unitario_estimado < 100000000
         and exists (select 1 from public.licitacoes_ti l where l.pncp_id = i.pncp_id and l.e_ti)
       group by t.label, t.q
       order by n desc`,
      params
    );
  },
  ["benchmark-list-v1"],
  { revalidate: 1800 }
);

export async function searchPrecos(term?: string, sub?: string) {
  if (!term || !term.trim()) return { stats: null as Record<string, unknown> | null, rows: [] as PrecoItem[] };
  const p: unknown[] = ["%" + term.trim() + "%"];
  let subWhere = "";
  if (sub && sub.trim()) {
    p.push(sub.trim());
    subWhere = ` and l.subcategoria = $${p.length}`;
  }

  const [statsArr, rows] = await Promise.all([
    q(
      `select count(*) n,
              percentile_cont(0.5) within group (order by i.valor_unitario_estimado) mediana,
              avg(i.valor_unitario_estimado) media,
              min(i.valor_unitario_estimado) minv,
              max(i.valor_unitario_estimado) maxv
       from public.licitacoes_itens i
       join public.licitacoes_ti l on l.pncp_id = i.pncp_id
       where l.e_ti and i.descricao ilike $1 and i.valor_unitario_estimado > 0 and i.valor_unitario_estimado < 100000000${subWhere}`,
      p
    ),
    q<PrecoItem>(
      `select i.descricao, i.quantidade, i.unidade_medida, i.valor_unitario_estimado, i.valor_total,
              l.orgao_entidade, l.uf, l.subcategoria, l.data_publicacao_pncp, l.link
       from public.licitacoes_itens i
       join public.licitacoes_ti l on l.pncp_id = i.pncp_id
       where l.e_ti and i.descricao ilike $1 and i.valor_unitario_estimado > 0 and i.valor_unitario_estimado < 100000000${subWhere}
       order by l.data_publicacao_pncp desc nulls last
       limit 60`,
      p
    ),
  ]);

  return { stats: statsArr[0] as Record<string, unknown>, rows };
}
