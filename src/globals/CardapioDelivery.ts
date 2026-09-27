import type { GlobalConfig } from 'payload'

// Cardápio do delivery (docs/features/pedidos-painel.md): itens do cardápio
// liberados para pedidos de delivery. Só o admin edita (e só ele acessa o
// /admin); a leitura é pública porque o formulário e o aside da aba Delivery
// do cliente listam estes itens.
//
// Duas listas: `itens` (produtos, sem os tamanhos) e `tamanhos` (itens da
// seção do tipo `tamanhos` que podem ser escolhidos para as pizzas no
// delivery). Sem nenhum tamanho liberado, as pizzas saem do delivery
// (`filtrarCardapioDelivery` em lib/cardapio.ts). O hook de criação de
// `pedidos` rejeita item ou tamanho fora destas listas.
export const CardapioDelivery: GlobalConfig = {
  slug: 'cardapio-delivery',
  label: 'Cardápio do delivery',
  access: {
    read: () => true,
    update: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'itens',
      type: 'relationship',
      relationTo: 'cardapio',
      hasMany: true,
      label: 'Itens disponíveis no delivery',
      filterOptions: { 'secao.tipo': { not_equals: 'tamanhos' } },
      admin: {
        description:
          'Itens do cardápio que podem ser pedidos no delivery. Os tamanhos das pizzas ficam no campo abaixo.',
      },
    },
    {
      name: 'tamanhos',
      type: 'relationship',
      relationTo: 'cardapio',
      hasMany: true,
      label: 'Tamanhos de pizza disponíveis no delivery',
      filterOptions: { 'secao.tipo': { equals: 'tamanhos' } },
      admin: {
        description:
          'Tamanhos que o cliente pode escolher para as pizzas no delivery. Sem nenhum tamanho, as pizzas não aparecem no delivery.',
      },
    },
  ],
}

export default CardapioDelivery
