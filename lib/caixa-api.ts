// Tipos e fetch do caixa (docs/features/caixa-historico.md e
// docs/features/caixa-contas-fechadas.md) — consumidos por
// components/CaixaForm.tsx, components/CaixaContas.tsx,
// components/CaixaPagamento.tsx e pelo histórico do dia. Access da collection
// `caixa`: só admin/funcionário.
//
// A API grava valores em REAIS; a UI trabalha o rateio em CENTAVOS
// (lib/caixa.ts). A conversão acontece aqui, na borda.

import {
  ehFormaPagamento,
  paraCentavos,
  paraReais,
  type ParteRateio,
} from './caixa'
import type { ItemPedidoEntrada } from './pedidos'

/** Linha de pagamento no formato da REST API (valores em reais). */
export interface PagamentoApi {
  id?: string | null
  valor: number
  forma?: string | null
  pago?: boolean | null
  pagoEm?: string | null
  editado?: boolean | null
}

/**
 * Ciclo da conta (caixa-contas-fechadas.md, RN-CF01): `fechada` aguarda o
 * caixa; `pagamento` tem valores congelados e rateio; `paga` está quitada.
 */
export type StatusConta = 'fechada' | 'pagamento' | 'paga'

export const ROTULO_STATUS_CONTA: Record<StatusConta, string> = {
  fechada: 'Fechada',
  pagamento: 'Em pagamento',
  paga: 'Paga',
}

/** Conta de mesa no formato devolvido pela REST API (depth=0). */
export interface ContaCaixa {
  id: number
  codigo: string
  mesa?: string | null
  itens: Array<{
    id?: string
    /** Id do item do cardápio (depth=0). */
    item: number
    /** Id do tamanho (pizzas). */
    tamanho?: number | null
    nomeSnapshot?: string | null
    quantidade: number
    precoUnitario?: number | null
  }>
  subtotal: number
  servico?: boolean | null
  taxaServico: number
  desconto: number
  total: number
  pagamentos?: PagamentoApi[] | null
  status: StatusConta
  observacoes?: string | null
  funcionario?: number | null
  createdAt: string
}

/** Parte do rateio na UI: centavos + id da linha (preserva `pagoEm`). */
export type ParteConta = ParteRateio & { id?: string | null; pagoEm?: string | null }

export function partesDaConta(conta: ContaCaixa): ParteConta[] {
  return (conta.pagamentos ?? []).map((linha) => ({
    id: linha.id,
    pagoEm: linha.pagoEm,
    valor: paraCentavos(linha.valor),
    forma: ehFormaPagamento(linha.forma) ? linha.forma : null,
    pago: Boolean(linha.pago),
    editado: Boolean(linha.editado),
  }))
}

function paraPagamentosApi(partes: ParteConta[]): PagamentoApi[] {
  return partes.map((parte) => ({
    ...(parte.id ? { id: parte.id } : {}),
    valor: paraReais(parte.valor),
    forma: parte.forma,
    pago: parte.pago,
    editado: parte.editado,
  }))
}

/** Extrai a mensagem de erro de uma resposta da REST do Payload. */
async function mensagemDeErro(res: Response, padrao: string): Promise<string> {
  try {
    const dados = (await res.json()) as { errors?: Array<{ message?: string }> }
    const mensagens = (dados.errors ?? []).map((e) => e.message).filter(Boolean)
    if (mensagens.length > 0) return mensagens.join(' ')
  } catch {
    // corpo não-JSON: cai no padrão
  }
  return `${padrao} (HTTP ${res.status}).`
}

export interface NovaConta {
  mesa?: string
  itens: ItemPedidoEntrada[]
  observacoes?: string
}

function corpoConta(conta: NovaConta): string {
  return JSON.stringify({
    mesa: conta.mesa ?? null,
    itens: conta.itens,
    observacoes: conta.observacoes ?? null,
  })
}

/** Fecha a conta (status `fechada`); o servidor calcula o total (nunca o cliente). */
export async function criarConta(nova: NovaConta): Promise<ContaCaixa> {
  const res = await fetch('/api/caixa?depth=0', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: corpoConta(nova),
  })
  if (!res.ok) throw new Error(await mensagemDeErro(res, 'Não foi possível fechar a conta'))
  const dados = (await res.json()) as { doc: ContaCaixa }
  return dados.doc
}

/** Salva a conta reaberta (continua `fechada`; o servidor recalcula o total). */
export async function atualizarConta(id: number, conta: NovaConta): Promise<ContaCaixa> {
  const res = await fetch(`/api/caixa/${id}?depth=0`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: corpoConta(conta),
  })
  if (!res.ok) throw new Error(await mensagemDeErro(res, 'Não foi possível salvar a conta'))
  const dados = (await res.json()) as { doc: ContaCaixa }
  return dados.doc
}

/**
 * Segue para o pagamento com o serviço e o desconto definidos pelo caixa
 * (desconto em centavos). A partir daqui os valores ficam congelados.
 */
export async function seguirParaPagamento(
  id: number,
  ajustes: { servico: boolean; desconto: number },
): Promise<ContaCaixa> {
  const res = await fetch(`/api/caixa/${id}?depth=0`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'pagamento',
      servico: ajustes.servico,
      desconto: paraReais(ajustes.desconto),
    }),
  })
  if (!res.ok) throw new Error(await mensagemDeErro(res, 'Não foi possível seguir para o pagamento'))
  const dados = (await res.json()) as { doc: ContaCaixa }
  return dados.doc
}

/** Grava o rateio; o servidor valida a soma e deriva o status. */
export async function salvarPagamentos(id: number, partes: ParteConta[]): Promise<ContaCaixa> {
  const res = await fetch(`/api/caixa/${id}?depth=0`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pagamentos: paraPagamentosApi(partes) }),
  })
  if (!res.ok) throw new Error(await mensagemDeErro(res, 'Não foi possível salvar o pagamento'))
  const dados = (await res.json()) as { doc: ContaCaixa }
  return dados.doc
}

export interface FiltroContas {
  /** Intervalo [início, fim) em ISO (ver intervaloDoDia em lib/pedidos-api.ts). */
  dia?: { inicio: string; fim: string }
  status?: StatusConta
  /** Ordem por data de criação: `-createdAt` (padrão) ou `createdAt`. */
  sort?: 'createdAt' | '-createdAt'
}

/** Todas as contas do filtro (sem paginação — volume de um dia de caixa). */
export async function buscarContas(filtro: FiltroContas): Promise<ContaCaixa[]> {
  const params = new URLSearchParams()
  params.set('sort', filtro.sort ?? '-createdAt')
  params.set('limit', '0')
  params.set('depth', '0')
  if (filtro.dia) {
    params.set('where[createdAt][greater_than_equal]', filtro.dia.inicio)
    params.set('where[createdAt][less_than]', filtro.dia.fim)
  }
  if (filtro.status) params.set('where[status][equals]', filtro.status)

  const res = await fetch(`/api/caixa?${params.toString()}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Falha ao buscar contas do caixa (HTTP ${res.status}).`)
  const dados = (await res.json()) as { docs?: ContaCaixa[] }
  return dados.docs ?? []
}
