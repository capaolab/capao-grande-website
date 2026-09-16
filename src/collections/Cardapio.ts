import type { CollectionConfig } from 'payload'

// Colecao_Cardapio (Requisito 6): itens do cardápio da pizzaria.
//
// Campos (Req 6.1): secao, nome, detalhe, preco, ordem, ativo.
// - `secao` restrito às 4 opções fixas (Req 6.2).
// - `detalhe` localizado pt/en (Req 3.4).
// - `preco` é TEXTO, nunca número (Req 6.3), para preservar valores como
//   "R$ 30,00", "ver tamanhos", "dose" e "jarra 1,5 l" palavra por palavra;
//   a renderização pública exibe o texto sem reformatação (Req 6.4).
// - `ordem` (number) ordena os itens dentro de cada seção (Req 6.5).
// - `ativo` (checkbox) filtra a listagem pública na camada de queries (Req 6.6).

// As quatro opções fixas de `secao` (Req 6.2). Os `value`s são preservados
// exatamente como no design/requisitos para que leitura pública e seed usem
// os mesmos valores.
const SECOES = ['Pizzas', 'Tamanhos', 'Bebidas', 'Vinhos'] as const

export const Cardapio: CollectionConfig = {
  slug: 'cardapio',
  admin: {
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'secao', 'preco', 'ordem', 'ativo'],
  },
  access: {
    // Leitura liberada; as leituras públicas filtram por `ativo` na camada de
    // queries (Req 6.6).
    read: () => true,
  },
  fields: [
    {
      name: 'secao',
      type: 'select',
      required: true, // Req 6.2: seção restrita às opções fixas
      label: 'Seção',
      options: SECOES.map((secao) => ({ label: secao, value: secao })),
    },
    {
      name: 'nome',
      type: 'text',
      required: true,
      label: 'Nome',
    },
    {
      name: 'detalhe',
      type: 'text',
      localized: true, // Req 3.4
      label: 'Detalhe',
    },
    {
      name: 'preco',
      // Req 6.3: preço é SEMPRE texto, nunca número, para preservar valores
      // não numéricos ("ver tamanhos", "dose", "jarra 1,5 l") verbatim.
      type: 'text',
      label: 'Preço',
      admin: {
        description:
          'Texto livre preservado palavra por palavra (ex.: "R$ 30,00", "ver tamanhos", "dose", "jarra 1,5 l").',
      },
    },
    {
      name: 'ordem',
      type: 'number', // Req 6.5: ordenação dentro de cada seção
      label: 'Ordem',
    },
    {
      name: 'ativo',
      type: 'checkbox', // Req 6.6
      defaultValue: true,
      label: 'Ativo',
    },
  ],
}

export default Cardapio
