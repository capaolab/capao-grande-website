import { APIError, type Access, type CollectionConfig } from 'payload'

// Seções do cardápio (docs/features/secoes-cardapio.md): cadastradas no
// painel em vez de fixas no código, para acrescentar produtos fora das
// seções atuais (ex.: Sobremesas).
//
// - `ordem`: ordem das seções no site, no delivery e no caixa.
// - `tipo` (RN-S02): o comportamento especial que antes dependia do NOME da
//   seção. `comum` = itens com preço próprio; `por-tamanho` = itens sem preço
//   próprio, o preço vem do tamanho (hoje Pizzas, "ver tamanhos" no site);
//   `tamanhos` = os itens SÃO os tamanhos (não são pedidos sozinhos). Existe
//   no máximo uma seção `tamanhos` (RN-S03).
//
// Access: leitura liberada; escrita só de admin. Seção com itens não pode
// ser removida (RN-S05).
const ehAdmin: Access = ({ req: { user } }) => user?.role === 'admin'

const TIPOS_SECAO = [
  { label: 'Comum (preço próprio)', value: 'comum' },
  { label: 'Preço pelo tamanho (ex.: pizzas)', value: 'por-tamanho' },
  { label: 'Tamanhos', value: 'tamanhos' },
] as const

export const SecoesCardapio: CollectionConfig = {
  slug: 'secoes-cardapio',
  labels: { singular: 'Seção do cardápio', plural: 'Seções do cardápio' },
  defaultSort: 'ordem',
  admin: {
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'tipo', 'ordem'],
  },
  access: {
    read: () => true,
    create: ehAdmin,
    update: ehAdmin,
    delete: ehAdmin,
  },
  fields: [
    {
      name: 'nome',
      type: 'text',
      required: true,
      unique: true,
      label: 'Nome',
    },
    {
      name: 'ordem',
      type: 'number',
      label: 'Ordem',
    },
    {
      name: 'tipo',
      type: 'select',
      required: true,
      defaultValue: 'comum',
      options: [...TIPOS_SECAO],
      label: 'Tipo',
      admin: {
        description:
          'Use "Comum" para seções novas. "Tamanhos" define os preços dos itens das seções "Preço pelo tamanho".',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      // No máximo uma seção de tamanhos (RN-S03).
      async ({ data, req, originalDoc }) => {
        if (data?.tipo !== 'tamanhos') return data
        const { docs } = await req.payload.find({
          collection: 'secoes-cardapio',
          where: { tipo: { equals: 'tamanhos' } },
          limit: 1,
          depth: 0,
          req,
        })
        if (docs.length > 0 && docs[0].id !== originalDoc?.id) {
          throw new APIError(`Já existe uma seção de tamanhos: "${docs[0].nome}".`, 400, null, true)
        }
        return data
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        const { totalDocs } = await req.payload.count({
          collection: 'cardapio',
          where: { secao: { equals: id } },
          req,
        })
        if (totalDocs > 0) {
          throw new APIError(
            `Esta seção tem ${totalDocs} item(ns) no cardápio. Mova ou remova os itens antes de excluí-la.`,
            400,
            null,
            true,
          )
        }
      },
    ],
  },
}

export default SecoesCardapio
