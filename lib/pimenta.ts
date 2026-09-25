// Funções puras dos pedidos de pimenta em mel
// (docs/features/pimenta-em-mel.md). Sem dependência de Payload/Next — mesmo
// padrão de lib/pedidos.ts — testadas em tests/pimenta.property.test.ts.
//
// A collection `pedidos-pimenta` (src/collections/PedidosPimenta.ts) e o
// endpoint POST /api/submeter-pedido-pimenta delegam a estas funções a
// validação da submissão e o cálculo do subtotal a partir dos preços ATUAIS
// da collection `produtos-pimenta` — nunca do cliente. O formulário
// (components/PedidoPimentaForm.tsx) usa o mesmo cálculo para o subtotal ao
// vivo.

import { coordenadaValida } from './geolocalizacao'
import type { ModalidadeEntrega } from './status-pedido'

export const MODALIDADES: readonly ModalidadeEntrega[] = ['entrega', 'retirada']

export const ROTULO_MODALIDADE: Record<ModalidadeEntrega, string> = {
  entrega: 'Entrega',
  retirada: 'Retirada na pizzaria',
}

export function ehModalidade(valor: unknown): valor is ModalidadeEntrega {
  return typeof valor === 'string' && (MODALIDADES as readonly string[]).includes(valor)
}

// ---------------------------------------------------------------------------
// Preço (unitário ou de lote)
// ---------------------------------------------------------------------------

/** Forma mínima de um produto aceita pelo cálculo. */
export interface ProdutoPimentaMinimo {
  id: number | string
  nome?: string | null
  volume?: string | null
  preco: number
  precoLote?: number | null
  loteMinimo?: number | null
}

/** Item como chega da submissão (id do produto + quantidade). */
export interface ItemPimentaEntrada {
  produto: number | string
  quantidade: number
}

export interface ItemPimentaResolvido {
  produto: number | string
  quantidade: number
  nomeSnapshot: string
  precoUnitario: number
  /** true quando o preço de lote foi aplicado. */
  lote: boolean
}

export type ResultadoSubtotalPimenta =
  | { ok: true; subtotal: number; itens: ItemPimentaResolvido[] }
  | { ok: false; erros: string[] }

/** O produto tem preço de lote configurado (preço + quantidade mínima ≥ 2). */
export function temPrecoLote(
  produto: ProdutoPimentaMinimo,
): produto is ProdutoPimentaMinimo & { precoLote: number; loteMinimo: number } {
  return (
    produto.precoLote != null &&
    produto.loteMinimo != null &&
    Number.isInteger(produto.loteMinimo) &&
    produto.loteMinimo >= 2
  )
}

/**
 * Preço unitário aplicável: o de lote quando configurado e a quantidade
 * atinge o mínimo; senão o unitário.
 */
export function precoAplicavel(
  produto: ProdutoPimentaMinimo,
  quantidade: number,
): { precoUnitario: number; lote: boolean } {
  if (temPrecoLote(produto) && quantidade >= produto.loteMinimo) {
    return { precoUnitario: produto.precoLote, lote: true }
  }
  return { precoUnitario: produto.preco, lote: false }
}

/** Nome de exibição do produto: "Nome (volume)". */
export function nomeProdutoPimenta(produto: ProdutoPimentaMinimo): string {
  const nome = produto.nome ?? ''
  return produto.volume ? `${nome} (${produto.volume})` : nome
}

/**
 * Subtotal do pedido a partir dos preços atuais. Não lança: devolve TODOS os
 * erros (produto inexistente, quantidade inválida) ou os itens resolvidos com
 * snapshot de nome/preço. Soma em centavos para evitar ruído de ponto
 * flutuante, devolvendo reais (como `calcularSubtotal` de lib/pedidos.ts).
 */
export function calcularSubtotalPimenta(
  itens: ItemPimentaEntrada[],
  produtos: ProdutoPimentaMinimo[],
): ResultadoSubtotalPimenta {
  const porId = new Map(produtos.map((p) => [String(p.id), p]))
  const erros: string[] = []
  const resolvidos: ItemPimentaResolvido[] = []

  for (const entrada of itens) {
    const produto = porId.get(String(entrada.produto))
    if (!produto) {
      erros.push(`Produto inexistente ou indisponível: ${entrada.produto}.`)
      continue
    }
    if (!Number.isInteger(entrada.quantidade) || entrada.quantidade < 1) {
      erros.push(
        `Quantidade inválida (${entrada.quantidade}) para ${nomeProdutoPimenta(produto)}: deve ser um inteiro maior ou igual a 1.`,
      )
      continue
    }
    const { precoUnitario, lote } = precoAplicavel(produto, entrada.quantidade)
    resolvidos.push({
      produto: entrada.produto,
      quantidade: entrada.quantidade,
      nomeSnapshot: nomeProdutoPimenta(produto),
      precoUnitario,
      lote,
    })
  }

  if (erros.length > 0) return { ok: false, erros }

  const centavos = resolvidos.reduce(
    (acc, i) => acc + Math.round(i.precoUnitario * 100) * i.quantidade,
    0,
  )
  return { ok: true, subtotal: centavos / 100, itens: resolvidos }
}

// ---------------------------------------------------------------------------
// Validação da submissão pública
// ---------------------------------------------------------------------------

/** Corpo JSON aceito por POST /api/submeter-pedido-pimenta. */
export interface PedidoPimentaInput {
  nome?: unknown
  telefone?: unknown
  estabelecimento?: unknown
  itens?: unknown
  modalidade?: unknown
  latitude?: unknown
  longitude?: unknown
  localidade?: unknown
  observacoes?: unknown
}

/**
 * Valida os campos obrigatórios: nome, telefone, ≥1 item com produto e
 * quantidade inteira ≥ 1, modalidade válida e — só na ENTREGA — um ponto no
 * mapa. Na retirada, coordenadas são ignoradas. Retorna erros em pt-BR.
 */
export function validarPedidoPimenta(input: PedidoPimentaInput): string[] {
  const erros: string[] = []

  if (typeof input.nome !== 'string' || input.nome.trim() === '') {
    erros.push('Nome é obrigatório.')
  }

  if (typeof input.telefone !== 'string' || input.telefone.trim() === '') {
    erros.push('Telefone (WhatsApp) é obrigatório.')
  }

  if (!Array.isArray(input.itens) || input.itens.length === 0) {
    erros.push('O pedido precisa de ao menos um produto.')
  } else {
    for (const [indice, item] of input.itens.entries()) {
      const bruto = item as Partial<ItemPimentaEntrada> | null
      if (bruto == null || typeof bruto !== 'object' || bruto.produto == null) {
        erros.push(`Item ${indice + 1}: produto é obrigatório.`)
        continue
      }
      if (
        typeof bruto.quantidade !== 'number' ||
        !Number.isInteger(bruto.quantidade) ||
        bruto.quantidade < 1
      ) {
        erros.push(`Item ${indice + 1}: quantidade deve ser um inteiro maior ou igual a 1.`)
      }
    }
  }

  if (!ehModalidade(input.modalidade)) {
    erros.push('Escolha entre entrega e retirada na pizzaria.')
  } else if (
    input.modalidade === 'entrega' &&
    !coordenadaValida(input.latitude, input.longitude)
  ) {
    erros.push('Para entrega, marque o ponto de entrega no mapa.')
  }

  return erros
}
