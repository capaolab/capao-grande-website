// Histórico do dia (docs/features/caixa-historico.md) — junta as contas do
// caixa e os pedidos de delivery de um dia para análise posterior. Funções
// PURAS (sem fetch), testadas em tests/historico.test.ts; o fetch fica em
// components/HistoricoDia.tsx.
//
// Valores do resumo em CENTAVOS (lib/caixa.ts). Delivery não registra forma
// de pagamento nem frete (o valor final é combinado no WhatsApp), então entra
// só com o subtotal dos produtos. Pedidos de pimenta em mel
// (docs/features/pimenta-em-mel.md, RN-P08) entram como uma terceira origem,
// com a mesma regra do delivery.

import {
  FORMAS_PAGAMENTO,
  paraCentavos,
  resumoPagamento,
  ROTULO_FORMA_PAGAMENTO,
  type FormaPagamento,
} from './caixa'
import { partesDaConta, ROTULO_STATUS_CONTA, type ContaCaixa } from './caixa-api'
import type { PedidoResumo } from './pedidos-api'
import { rotuloStatus } from './status-pedido'

export interface ResumoCaixaDia {
  contas: number
  pagas: number
  abertas: number
  subtotal: number
  taxaServico: number
  desconto: number
  /** Soma dos totais das contas (o que foi faturado). */
  total: number
  /** Soma das partes pagas. */
  recebido: number
  porForma: Record<FormaPagamento, number>
  /** Total ainda não pago (contas fechadas e em pagamento). */
  emDebito: number
  /** total / contas (0 sem contas). */
  ticketMedio: number
  /** Número de pessoas pagantes (partes do rateio). */
  pessoas: number
}

export interface ResumoDeliveryDia {
  pedidos: number
  subtotal: number
  porStatus: Record<string, number>
}

export interface ResumoDia {
  caixa: ResumoCaixaDia
  delivery: ResumoDeliveryDia
  /** Pedidos de pimenta em mel (mesmo formato do delivery). */
  pimenta: ResumoDeliveryDia
  /** Caixa (total das contas) + delivery + pimenta (subtotal dos produtos). */
  totalGeral: number
}

/** Resumo de pedidos (delivery ou pimenta): quantidade, subtotal e status. */
function resumirPedidos(pedidos: PedidoResumo[]): ResumoDeliveryDia {
  const resumo: ResumoDeliveryDia = { pedidos: pedidos.length, subtotal: 0, porStatus: {} }
  for (const pedido of pedidos) {
    resumo.subtotal += paraCentavos(pedido.subtotal ?? 0)
    resumo.porStatus[pedido.status] = (resumo.porStatus[pedido.status] ?? 0) + 1
  }
  return resumo
}

export function resumirDia(
  pedidos: PedidoResumo[],
  contas: ContaCaixa[],
  pedidosPimenta: PedidoResumo[] = [],
): ResumoDia {
  const caixa: ResumoCaixaDia = {
    contas: contas.length,
    pagas: 0,
    abertas: 0,
    subtotal: 0,
    taxaServico: 0,
    desconto: 0,
    total: 0,
    recebido: 0,
    porForma: { pix: 0, dinheiro: 0, cartao: 0 },
    emDebito: 0,
    ticketMedio: 0,
    pessoas: 0,
  }

  for (const conta of contas) {
    const total = paraCentavos(conta.total)
    const partes = partesDaConta(conta)
    const resumo = resumoPagamento(total, partes)
    if (conta.status === 'paga') caixa.pagas++
    else caixa.abertas++
    caixa.subtotal += paraCentavos(conta.subtotal)
    caixa.taxaServico += paraCentavos(conta.taxaServico)
    caixa.desconto += paraCentavos(conta.desconto)
    caixa.total += total
    caixa.recebido += resumo.pago
    caixa.emDebito += resumo.emDebito
    caixa.pessoas += partes.length
    for (const forma of FORMAS_PAGAMENTO) caixa.porForma[forma] += resumo.porForma[forma]
  }
  caixa.ticketMedio = caixa.contas > 0 ? Math.round(caixa.total / caixa.contas) : 0

  const delivery = resumirPedidos(pedidos)
  const pimenta = resumirPedidos(pedidosPimenta)

  return {
    caixa,
    delivery,
    pimenta,
    totalGeral: caixa.total + delivery.subtotal + pimenta.subtotal,
  }
}

// ---------------------------------------------------------------------------
// Lista unificada (caixa + delivery + pimenta) e exportação CSV
// ---------------------------------------------------------------------------

export type OrigemHistorico = 'caixa' | 'delivery' | 'pimenta'

export const ROTULO_ORIGEM: Record<OrigemHistorico, string> = {
  caixa: 'Caixa',
  delivery: 'Delivery',
  pimenta: 'Pimenta em mel',
}

export interface LinhaHistorico {
  origem: OrigemHistorico
  id: number
  codigo: string
  criadoEm: string
  /** Mesa (caixa), nome do cliente (delivery) ou estabelecimento/cliente (pimenta). */
  referencia: string
  itens: string
  /** Valores em centavos. Delivery: total = subtotal (sem frete). */
  subtotal: number
  taxaServico: number
  desconto: number
  total: number
  pago: number
  emDebito: number
  /** Rótulo legível do status. */
  status: string
  /** Valor bruto do status (`fechada`/`pagamento`/`paga` ou status do pedido). */
  statusValor: string
  /** Pagamentos por pessoa, ex.: "Pix R$ 20,00 (pago); Cartão R$ 19,00". */
  pagamentos: string
  /** Só pimenta: entrega ou retirada. */
  modalidade?: 'entrega' | 'retirada'
}

function descreverItens(itens: Array<{ nomeSnapshot?: string | null; quantidade: number }>): string {
  return itens.map((i) => `${i.quantidade}× ${i.nomeSnapshot ?? 'item'}`).join(', ')
}

function reais(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',')
}

/** Linha de um pedido (delivery ou pimenta): total = subtotal, sem pagamentos. */
function linhaPedido(pedido: PedidoResumo, origem: 'delivery' | 'pimenta'): LinhaHistorico {
  const subtotal = paraCentavos(pedido.subtotal ?? 0)
  const modalidade = pedido.modalidade ?? undefined
  return {
    origem,
    id: pedido.id,
    codigo: pedido.codigo,
    criadoEm: pedido.createdAt,
    referencia: pedido.estabelecimento
      ? `${pedido.estabelecimento} (${pedido.nome})`
      : pedido.nome,
    itens: descreverItens(pedido.itens),
    subtotal,
    taxaServico: 0,
    desconto: 0,
    total: subtotal,
    pago: 0,
    emDebito: 0,
    status: rotuloStatus(pedido.status, modalidade),
    statusValor: pedido.status,
    pagamentos: '',
    ...(modalidade ? { modalidade } : {}),
  }
}

/** Contas e pedidos do dia numa lista só, em ordem cronológica. */
export function montarLinhas(
  pedidos: PedidoResumo[],
  contas: ContaCaixa[],
  pedidosPimenta: PedidoResumo[] = [],
): LinhaHistorico[] {
  const linhasCaixa: LinhaHistorico[] = contas.map((conta) => {
    const total = paraCentavos(conta.total)
    const partes = partesDaConta(conta)
    const resumo = resumoPagamento(total, partes)
    return {
      origem: 'caixa',
      id: conta.id,
      codigo: conta.codigo,
      criadoEm: conta.createdAt,
      referencia: conta.mesa ? `Mesa ${conta.mesa}` : '',
      itens: descreverItens(conta.itens),
      subtotal: paraCentavos(conta.subtotal),
      taxaServico: paraCentavos(conta.taxaServico),
      desconto: paraCentavos(conta.desconto),
      total,
      pago: resumo.pago,
      emDebito: resumo.emDebito,
      status: ROTULO_STATUS_CONTA[conta.status],
      statusValor: conta.status,
      pagamentos: partes
        .map(
          (p) =>
            `${p.forma ? ROTULO_FORMA_PAGAMENTO[p.forma] : 'A definir'} R$ ${reais(p.valor)}${
              p.pago ? ' (pago)' : ''
            }`,
        )
        .join('; '),
    }
  })

  const linhasDelivery = pedidos.map((pedido) => linhaPedido(pedido, 'delivery'))
  const linhasPimenta = pedidosPimenta.map((pedido) => linhaPedido(pedido, 'pimenta'))

  return [...linhasCaixa, ...linhasDelivery, ...linhasPimenta].sort((a, b) =>
    a.criadoEm.localeCompare(b.criadoEm),
  )
}

function campoCsv(valor: string): string {
  return /[";\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor
}

/**
 * CSV do dia para planilha: separador `;` e vírgula decimal (padrão do
 * Excel/LibreOffice em pt-BR). `formatarHora` recebe o ISO e devolve a
 * data/hora local legível.
 */
export function gerarCsv(linhas: LinhaHistorico[], formatarHora: (iso: string) => string): string {
  const cabecalho = [
    'Origem',
    'Código',
    'Data/hora',
    'Mesa/Cliente',
    'Itens',
    'Subtotal',
    'Taxa de serviço',
    'Desconto',
    'Total',
    'Pago',
    'Em débito',
    'Status',
    'Pagamentos',
  ]
  const corpo = linhas.map((l) =>
    [
      ROTULO_ORIGEM[l.origem],
      l.codigo,
      formatarHora(l.criadoEm),
      l.referencia,
      l.itens,
      reais(l.subtotal),
      reais(l.taxaServico),
      reais(l.desconto),
      reais(l.total),
      reais(l.pago),
      reais(l.emDebito),
      l.status,
      l.pagamentos,
    ]
      .map(campoCsv)
      .join(';'),
  )
  return [cabecalho.join(';'), ...corpo].join('\n')
}
