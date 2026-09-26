import { APIError, type CollectionConfig } from 'payload'

import {
  calcularTotalConta,
  ehFormaPagamento,
  FORMAS_PAGAMENTO,
  paraCentavos,
  paraReais,
  resumoPagamento,
  ROTULO_FORMA_PAGAMENTO,
  validarRateio,
  type ParteRateio,
} from '@/lib/caixa'

import { gerarCodigoUnico } from './codigo-unico'
import { resolverItensCardapio, type ItemDocumentoCardapio } from './itens-cardapio'

// Colecao_Caixa (docs/features/caixa-historico.md e
// docs/features/caixa-contas-fechadas.md): contas de mesa da pizzaria.
//
// Ciclo da conta (RN-CF01):
// - `fechada`: itens lançados, aguardando o caixa. Itens editáveis e
//   recalculados com o cardápio atual a cada gravação (RN-CF04); sem serviço,
//   desconto nem rateio.
// - `pagamento`: o caixa definiu serviço/desconto e seguiu para o pagamento.
//   Itens e valores ficam congelados (RN-CF05) — uma mudança de preço no
//   cardápio não pode mexer numa conta já rateada.
// - `paga`: todas as partes pagas (derivado no servidor, RN-C07).
// Não há volta para `fechada` (RN-CF06).
//
// Campos:
// - `codigo`/`mesa`: referência da conta (código gerado; mesa opcional).
// - `itens`: mesma forma de `pedidos` (item + quantidade + tamanho), com
//   snapshots de nome/preço resolvidos no servidor.
// - `subtotal`, `servico` (10% opcional), `taxaServico`, `desconto`,
//   `total`: calculados no servidor.
// - `pagamentos`: rateio por pessoa — valor, forma (pix/dinheiro/cartão) e
//   check de pago (RN-C04..C06). A soma das partes sempre fecha o total.
// - `funcionario`: quem fechou a conta (req.user na criação).
//
// Valores monetários gravados em REAIS (como `pedidos.subtotal`); as contas
// de rateio acontecem em centavos em lib/caixa.ts.
//
// Access: operação da pizzaria — admin e funcionário criam, leem e atualizam;
// só admin remove.

const STATUS_CONTA = [
  { label: 'Fechada', value: 'fechada' },
  { label: 'Em pagamento', value: 'pagamento' },
  { label: 'Paga', value: 'paga' },
] as const

const ehOperacao = (role: unknown) => role === 'admin' || role === 'funcionario'

/** Linha de `pagamentos` como chega no hook (valores em reais). */
interface PagamentoDocumento {
  id?: string | null
  valor?: number | null
  forma?: string | null
  pago?: boolean | null
  pagoEm?: string | null
  editado?: boolean | null
}

function paraParte(linha: PagamentoDocumento): ParteRateio {
  return {
    valor: paraCentavos(linha.valor ?? 0),
    forma: ehFormaPagamento(linha.forma) ? linha.forma : null,
    pago: Boolean(linha.pago),
    editado: Boolean(linha.editado),
  }
}

/** Relações de `itens` como id (o documento original pode vir populado). */
function semRelacaoPopulada(linha: ItemDocumentoCardapio): ItemDocumentoCardapio {
  const id = (valor: unknown) =>
    typeof valor === 'object' && valor !== null ? (valor as { id: unknown }).id : valor
  return { ...linha, item: id(linha.item), tamanho: id(linha.tamanho) }
}

export const Caixa: CollectionConfig = {
  slug: 'caixa',
  labels: { singular: 'Conta de mesa', plural: 'Caixa' },
  defaultSort: '-createdAt',
  admin: {
    useAsTitle: 'codigo',
    defaultColumns: ['codigo', 'mesa', 'total', 'status', 'funcionario', 'createdAt'],
  },
  access: {
    create: ({ req: { user } }) => ehOperacao(user?.role),
    read: ({ req: { user } }) => ehOperacao(user?.role),
    update: ({ req: { user } }) => ehOperacao(user?.role),
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'codigo',
      type: 'text',
      unique: true,
      index: true,
      label: 'Código',
      admin: { readOnly: true, description: 'Gerado automaticamente na criação.' },
    },
    {
      name: 'mesa',
      type: 'text',
      label: 'Mesa',
    },
    {
      name: 'itens',
      type: 'array',
      required: true,
      minRows: 1,
      label: 'Itens consumidos',
      fields: [
        {
          name: 'item',
          type: 'relationship',
          relationTo: 'cardapio',
          required: true,
          label: 'Item do cardápio',
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
          name: 'tamanho',
          type: 'relationship',
          relationTo: 'cardapio',
          label: 'Tamanho',
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
      ],
    },
    {
      name: 'subtotal',
      type: 'number',
      label: 'Subtotal dos itens (R$)',
      admin: { readOnly: true },
    },
    {
      name: 'servico',
      type: 'checkbox',
      defaultValue: false,
      label: 'Taxa de serviço (10%)',
    },
    {
      name: 'taxaServico',
      type: 'number',
      label: 'Taxa de serviço (R$)',
      admin: { readOnly: true },
    },
    {
      name: 'desconto',
      type: 'number',
      min: 0,
      defaultValue: 0,
      label: 'Desconto (R$)',
    },
    {
      name: 'total',
      type: 'number',
      label: 'Total da conta (R$)',
      admin: { readOnly: true },
    },
    {
      name: 'pagamentos',
      type: 'array',
      label: 'Pagamentos (rateio por pessoa)',
      fields: [
        { name: 'valor', type: 'number', required: true, min: 0, label: 'Valor (R$)' },
        {
          name: 'forma',
          type: 'select',
          label: 'Forma de pagamento',
          options: FORMAS_PAGAMENTO.map((forma) => ({
            label: ROTULO_FORMA_PAGAMENTO[forma],
            value: forma,
          })),
        },
        { name: 'pago', type: 'checkbox', defaultValue: false, label: 'Pago' },
        {
          name: 'pagoEm',
          type: 'date',
          label: 'Pago em',
          admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'editado',
          type: 'checkbox',
          defaultValue: false,
          label: 'Valor ajustado manualmente',
          admin: { hidden: true },
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'fechada',
      options: [...STATUS_CONTA],
      label: 'Status',
      admin: {
        readOnly: true,
        description:
          '"Fechada" aguarda o caixa; "Em pagamento" congela os valores; "Paga" quando todas as partes estão pagas.',
      },
    },
    {
      name: 'funcionario',
      type: 'relationship',
      relationTo: 'users',
      label: 'Fechada por',
      admin: { readOnly: true },
    },
    {
      name: 'observacoes',
      type: 'textarea',
      label: 'Observações',
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        const anterior = operation === 'create' ? null : (originalDoc?.status as string | undefined)
        const pedido = data.status as string | undefined

        if (operation === 'create') {
          if (!data.codigo) data.codigo = await gerarCodigoUnico(req, 'caixa')
          if (req.user) data.funcionario = req.user.id
        } else if (anterior && anterior !== 'fechada' && pedido === 'fechada') {
          throw new APIError('Conta em pagamento não pode voltar a ser fechada.', 400, null, true)
        }

        if (!anterior || anterior === 'fechada') {
          // Itens e total: calculados no servidor a partir do cardápio atual
          // (nunca do cliente) enquanto a conta está fechada (RN-CF04).
          const resolvido = await resolverItensCardapio(
            ((data.itens ?? originalDoc?.itens ?? []) as ItemDocumentoCardapio[]).map(
              semRelacaoPopulada,
            ),
            req,
            'Conta',
          )
          // Serviço e desconto são definidos pelo caixa ao seguir para o
          // pagamento (RN-CF05); antes disso, a conta vale o subtotal.
          const seguindo = pedido === 'pagamento'
          const conta = calcularTotalConta({
            subtotal: paraCentavos(resolvido.subtotal),
            servico: seguindo && Boolean(data.servico),
            desconto: seguindo ? paraCentavos(Number(data.desconto ?? 0)) : 0,
          })
          if (!conta.ok) throw new APIError(conta.erro, 400, null, true)

          data.itens = resolvido.itens
          data.subtotal = paraReais(conta.subtotal)
          data.servico = seguindo && Boolean(data.servico)
          data.taxaServico = paraReais(conta.taxaServico)
          data.desconto = paraReais(conta.desconto)
          data.total = paraReais(conta.total)

          if (!seguindo) {
            if (((data.pagamentos ?? []) as PagamentoDocumento[]).length > 0) {
              throw new APIError('Siga para o pagamento antes de dividir a conta.', 400, null, true)
            }
            data.pagamentos = []
            data.status = 'fechada'
            return data
          }
        } else if (originalDoc) {
          // Conta em pagamento: itens e valores congelados (RN-CF05). Só o
          // rateio, a mesa e as observações mudam daqui em diante.
          for (const campo of [
            'codigo',
            'itens',
            'subtotal',
            'servico',
            'taxaServico',
            'desconto',
            'total',
            'funcionario',
          ] as const) {
            data[campo] = originalDoc[campo]
          }
        }

        // Rateio: a soma das partes fecha o total, parte paga exige forma de
        // pagamento (RN-C04..C06).
        const total = paraCentavos(Number(data.total ?? 0))
        const linhas = (data.pagamentos ?? []) as PagamentoDocumento[]
        const partes = linhas.map(paraParte)
        const erros = validarRateio(total, partes)
        if (erros.length > 0) throw new APIError(erros.join(' '), 400, null, true)

        // `pagoEm` marca o momento do check (preservado enquanto continuar
        // pago; limpo se o pagamento for desmarcado).
        const anteriores = new Map(
          ((originalDoc?.pagamentos ?? []) as PagamentoDocumento[])
            .filter((linha) => linha.id)
            .map((linha) => [linha.id, linha]),
        )
        const agora = new Date().toISOString()
        data.pagamentos = linhas.map((linha) => {
          const anterior = linha.id ? anteriores.get(linha.id) : undefined
          const pagoEm = linha.pago ? (anterior?.pago && anterior.pagoEm) || agora : null
          return { ...linha, pagoEm }
        })

        data.status = resumoPagamento(total, partes).quitada ? 'paga' : 'pagamento'

        return data
      },
    ],
  },
  timestamps: true,
}

export default Caixa
