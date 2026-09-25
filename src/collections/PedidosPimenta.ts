import type { CollectionConfig } from 'payload'

import { coordenadaValida } from '@/lib/geolocalizacao'
import { MODALIDADES, ROTULO_MODALIDADE } from '@/lib/pimenta'
import { OPCOES_STATUS_PEDIDO } from '@/lib/status-pedido'
import { normalizarTelefone } from '@/lib/telefone'

import { gerarCodigoUnico } from './codigo-unico'
import { resolverItensPimenta } from './itens-pimenta'

// Pedidos de pimenta em mel (docs/features/pimenta-em-mel.md) — espelha a
// collection `pedidos` (delivery), com as diferenças:
// - `itens` referenciam `produtos-pimenta`; o preço unitário é o de LOTE
//   quando a quantidade atinge o mínimo do produto (flag `lote` no item).
// - `modalidade`: entrega (ponto no mapa obrigatório — validado no hook) ou
//   retirada na pizzaria (sem coordenadas).
// - `estabelecimento`: nome opcional do restaurante, para pedidos em lote.
// - Itens e subtotal são calculados NO SERVIDOR só na criação e congelados
//   depois (como `caixa`): mudar o status não depende do catálogo atual.
// - `status`: MESMO funil do delivery (RN-P04), gerenciado pelo funcionário em
//   /area-funcionario/pimenta e acompanhado pelo cliente em /area-cliente.
//
// Access idêntico ao de `pedidos` (dashboard-pedidos.md, RN-D05): criação
// exige sessão (fluxo normal via POST /api/submeter-pedido-pimenta); leitura
// total para admin/funcionário e, para o cliente, só os pedidos do próprio
// telefone; atualização pela operação; remoção só de admin.
export const PedidosPimenta: CollectionConfig = {
  slug: 'pedidos-pimenta',
  labels: { singular: 'Pedido de pimenta em mel', plural: 'Pedidos de pimenta em mel' },
  defaultSort: '-createdAt',
  admin: {
    useAsTitle: 'codigo',
    defaultColumns: ['codigo', 'nome', 'estabelecimento', 'modalidade', 'status', 'subtotal', 'createdAt'],
  },
  access: {
    create: ({ req: { user } }) => Boolean(user),
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin' || user.role === 'funcionario') return true
      if (user.role === 'cliente' && typeof user.telefone === 'string' && user.telefone) {
        return { telefone: { equals: user.telefone } }
      }
      return false
    },
    update: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'funcionario',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'codigo',
      type: 'text',
      unique: true,
      index: true,
      label: 'Código',
      admin: {
        readOnly: true,
        description: 'Código público gerado na criação — referência na conversa do WhatsApp.',
      },
    },
    { name: 'nome', type: 'text', required: true, label: 'Nome' },
    { name: 'telefone', type: 'text', required: true, label: 'Telefone (WhatsApp)' },
    {
      name: 'estabelecimento',
      type: 'text',
      label: 'Estabelecimento',
      admin: { description: 'Opcional: restaurante ou comércio que fez o pedido.' },
    },
    {
      name: 'itens',
      type: 'array',
      required: true,
      minRows: 1,
      label: 'Itens do pedido',
      fields: [
        {
          name: 'produto',
          type: 'relationship',
          relationTo: 'produtos-pimenta',
          required: true,
          label: 'Produto',
        },
        {
          name: 'quantidade',
          type: 'number',
          required: true,
          min: 1,
          defaultValue: 1,
          label: 'Quantidade',
        },
        {
          name: 'nomeSnapshot',
          type: 'text',
          label: 'Nome (snapshot)',
          admin: { readOnly: true },
        },
        {
          name: 'precoUnitario',
          type: 'number',
          label: 'Preço unitário (snapshot)',
          admin: { readOnly: true },
        },
        {
          name: 'lote',
          type: 'checkbox',
          label: 'Preço de lote aplicado',
          admin: { readOnly: true },
        },
      ],
    },
    {
      name: 'modalidade',
      type: 'select',
      required: true,
      defaultValue: 'entrega',
      label: 'Modalidade',
      options: MODALIDADES.map((value) => ({ label: ROTULO_MODALIDADE[value], value })),
    },
    {
      name: 'latitude',
      type: 'number',
      label: 'Latitude da entrega',
      admin: { condition: (dados) => dados?.modalidade === 'entrega' },
    },
    {
      name: 'longitude',
      type: 'number',
      label: 'Longitude da entrega',
      admin: { condition: (dados) => dados?.modalidade === 'entrega' },
    },
    {
      name: 'localidade',
      type: 'text',
      label: 'Localidade / referência',
      admin: { condition: (dados) => dados?.modalidade === 'entrega' },
    },
    { name: 'observacoes', type: 'textarea', label: 'Observações' },
    {
      name: 'subtotal',
      type: 'number',
      label: 'Subtotal dos produtos (R$)',
      admin: {
        readOnly: true,
        description:
          'Calculado no servidor (preço unitário ou de lote). Não inclui frete — combinado pelo WhatsApp.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pendente',
      options: OPCOES_STATUS_PEDIDO,
      label: 'Status',
      admin: {
        description:
          'Mesmo funil do delivery. Na retirada, "Em trânsito" aparece ao cliente como "Pronto para retirada".',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && typeof data.telefone === 'string' && data.telefone.trim() !== '') {
          data.telefone = normalizarTelefone(data.telefone)
        }
        return data
      },
    ],
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        if (operation === 'create') {
          if (!data.codigo) data.codigo = await gerarCodigoUnico(req, 'pedidos-pimenta')
          const resolvido = await resolverItensPimenta(data.itens ?? [], req)
          data.itens = resolvido.itens
          data.subtotal = resolvido.subtotal
        } else if (originalDoc) {
          // Itens, preços e código congelados após a criação.
          data.codigo = originalDoc.codigo
          data.itens = originalDoc.itens
          data.subtotal = originalDoc.subtotal
        }

        // Entrega exige ponto no mapa; retirada descarta coordenadas.
        if (data.modalidade === 'retirada') {
          data.latitude = null
          data.longitude = null
        } else if (!coordenadaValida(data.latitude, data.longitude)) {
          throw new Error('Pedido inválido: para entrega, informe o ponto no mapa.')
        }

        return data
      },
    ],
  },
  timestamps: true,
}

export default PedidosPimenta
