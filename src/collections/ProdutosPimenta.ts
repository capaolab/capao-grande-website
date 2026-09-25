import type { Access, CollectionConfig, NumberFieldSingleValidation } from 'payload'

// Produtos de pimenta em mel (docs/features/pimenta-em-mel.md, RN-P02):
// catálogo próprio, separado do cardápio da pizzaria — cada produto é uma
// apresentação (ex.: frasco de 150 ml) com preço unitário e, opcionalmente,
// preço de lote a partir de uma quantidade mínima (pedidos de restaurantes).
//
// - `preco`: valor canônico em reais (numérico, como `cardapio.preco`).
// - `precoLote` + `loteMinimo`: preço unitário aplicado quando a quantidade
//   pedida atinge `loteMinimo` (regra em lib/pimenta.ts → precoAplicavel).
// - `ativo`: filtra a listagem pública e o formulário de pedido.
//
// Access: leitura liberada (a página pública lista os produtos; a leitura
// pública filtra `ativo` em lib/queries.ts); escrita só de admin.
const ehAdmin: Access = ({ req: { user } }) => user?.role === 'admin'

// Lote mínimo: obrigatório quando há preço de lote; inteiro ≥ 2.
const validarLoteMinimo: NumberFieldSingleValidation = (valor, { siblingData }) => {
  const irmaos = siblingData as { precoLote?: number | null }
  if (irmaos.precoLote != null && valor == null) {
    return 'Informe o lote mínimo para usar o preço de lote.'
  }
  if (valor != null && (!Number.isInteger(valor) || valor < 2)) {
    return 'O lote mínimo deve ser um inteiro maior ou igual a 2.'
  }
  return true
}

export const ProdutosPimenta: CollectionConfig = {
  slug: 'produtos-pimenta',
  labels: { singular: 'Produto de pimenta em mel', plural: 'Produtos de pimenta em mel' },
  defaultSort: 'ordem',
  admin: {
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'volume', 'preco', 'precoLote', 'loteMinimo', 'ativo'],
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
      label: 'Nome',
    },
    {
      name: 'volume',
      type: 'text',
      label: 'Volume / apresentação',
      admin: { description: 'Ex.: "150 ml", "1 L".' },
    },
    {
      name: 'descricao',
      type: 'textarea',
      label: 'Descrição',
    },
    {
      name: 'preco',
      type: 'number',
      required: true,
      min: 0,
      label: 'Preço unitário (R$)',
    },
    {
      name: 'precoLote',
      type: 'number',
      min: 0,
      label: 'Preço unitário no lote (R$)',
      admin: {
        description:
          'Opcional. Aplicado a cada unidade quando a quantidade pedida atinge o lote mínimo.',
      },
    },
    {
      name: 'loteMinimo',
      type: 'number',
      min: 2,
      label: 'Lote mínimo (unidades)',
      admin: {
        description: 'Quantidade a partir da qual vale o preço de lote. Obrigatório se houver preço de lote.',
      },
      validate: validarLoteMinimo,
    },
    {
      name: 'imagem',
      type: 'upload',
      relationTo: 'media',
      label: 'Imagem',
    },
    {
      name: 'ordem',
      type: 'number',
      label: 'Ordem',
    },
    {
      name: 'ativo',
      type: 'checkbox',
      defaultValue: true,
      label: 'Ativo',
    },
  ],
}

export default ProdutosPimenta
