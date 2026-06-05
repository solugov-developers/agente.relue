import { q } from "./db";

export type EditalItem = {
  numero_item: number | null;
  descricao: string | null;
  quantidade: string | null;
  unidade_medida: string | null;
  valor_unitario_estimado: string | null;
  valor_total: string | null;
};

export async function getEdital(id: string) {
  const [lic] = await q<Record<string, unknown>>(
    `select pncp_id, orgao_entidade, unidade_orgao, cnpj_orgao, uf, municipio, esfera_id,
            modalidade_nome, objeto_compra, valor_total_estimado, valor_total_homologado,
            situacao_compra_nome, ano_compra, sequencial_compra, data_publicacao_pncp,
            data_abertura_proposta, data_encerramento_proposta, link, subcategoria, resumo,
            score_oportunidade
     from public.licitacoes_ti where pncp_id = $1`,
    [id]
  );
  if (!lic) return null;

  const [itens, marcas] = await Promise.all([
    q<EditalItem>(
      `select numero_item, descricao, quantidade, unidade_medida, valor_unitario_estimado, valor_total
       from public.licitacoes_itens where pncp_id = $1 order by numero_item`,
      [id]
    ),
    q<{ marca: string }>(`select marca from public.v_marcas where pncp_id = $1`, [id]),
  ]);

  return { lic, itens, marcas: marcas.map((m) => m.marca) };
}
