import type { CollectionConfig } from 'payload'

// Colecao_Cardapio (Requisito 6): itens do cardápio da pizzaria.
//
// Campos (Req 6.1): secao, nome, detalhe, preco, ordem, ativo.
// - `secao` aponta para a collection `secoes-cardapio`
//   (docs/features/secoes-cardapio.md, substitui as 4 opções fixas do Req 6.2).
// - `detalhe` localizado pt/en (Req 3.4).
// - `preco` é NÚMERO (não obrigatório) — decisão registrada em
//   docs/features/delivery-pedidos.md (P1 / Tarefa 6): o antigo Requisito 6.3
//   (preço como texto verbatim, ex.: "ver tamanhos") DEIXA DE VALER, pois um
//   preço numérico canônico é pré-requisito para calcular o subtotal de
//   pedidos de delivery. A formatação pt-BR ("R$ 30,00") acontece na camada de
//   renderização (`renderPreco` em lib/cardapio.ts). Itens de preço variável
//   (Pizzas, cujo valor depende do tamanho) ficam com `preco: null` — o preço
//   é resolvido pela combinação pizza + tamanho (seção Tamanhos) no pedido, e
//   a renderização pública exibe "ver tamanhos" nesse caso (MenuSection).
// - `ordem` (number) ordena os itens dentro de cada seção (Req 6.5).
// - `ativo` (checkbox) filtra a listagem pública na camada de queries (Req 6.6).

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
      type: 'relationship',
      relationTo: 'secoes-cardapio',
      required: true,
      label: 'Seção',
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
      // Número, NÃO obrigatório (delivery-pedidos.md, P1 / Tarefa 6): o preço
      // numérico é o valor canônico; a formatação "R$ 30,00" acontece na
      // renderização (renderPreco em lib/cardapio.ts). Itens de preço variável
      // (Pizzas) ficam sem preço próprio — resolvido via seção Tamanhos.
      type: 'number',
      label: 'Preço (R$)',
      admin: {
        description:
          'Valor numérico em reais (ex.: 30 para "R$ 30,00"). Deixe vazio em itens cujo preço depende do tamanho (pizzas).',
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
