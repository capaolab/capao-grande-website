// Funções puras dos pedidos de delivery (docs/features/delivery-pedidos.md,
// Tarefas 1 e 4). Nenhuma dependência de Payload/Next/DB — mesmo padrão de
// lib/cardapio.ts — para permitir testes de propriedade com entradas
// sintéticas (tests/pedidos.property.test.ts).
//
// A collection `pedidos` (src/collections/Pedidos.ts) e o endpoint público
// (src/endpoints/submeter-pedido.ts) delegam a estas funções toda a decisão
// de domínio: formato do código público, validação da submissão e cálculo do
// subtotal a partir dos preços ATUAIS do cardápio (nunca do cliente).

import type { Cardapio } from '@/src/payload-types'

// ---------------------------------------------------------------------------
// Código público do pedido (RN04, P2)
// ---------------------------------------------------------------------------

// Alfabeto sem caracteres ambíguos: sem 0/O nem 1/I, para o código ser
// legível e ditável na conversa de WhatsApp (P2).
export const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const TAMANHO_CODIGO = 4

/**
 * Gera o código público do pedido: `TAMANHO_CODIGO` caracteres de
 * `ALFABETO_CODIGO` (sem ambíguos). `random` é injetável (função no estilo
 * `Math.random`, retornando [0, 1)) para tornar a geração testável.
 */
export function gerarCodigoPedido(random: () => number = Math.random): string {
  let codigo = ''
  for (let i = 0; i < TAMANHO_CODIGO; i++) {
    const indice = Math.floor(random() * ALFABETO_CODIGO.length)
    codigo += ALFABETO_CODIGO[indice]
  }
  return codigo
}

// ---------------------------------------------------------------------------
// Cálculo do subtotal (Tarefa 1: subtotal calculado NO SERVIDOR)
// ---------------------------------------------------------------------------

/** Item do pedido como chega da submissão (ids do cardápio + quantidade). */
export interface ItemPedidoEntrada {
  /** Id do item do cardápio. */
  item: number | string
  /** Quantidade (inteiro >= 1). */
  quantidade: number
  /** Id do tamanho (item da seção Tamanhos) — obrigatório quando o item não tem preço próprio (pizzas). */
  tamanho?: number | string | null
}

/** Forma mínima de um item do cardápio aceita por `calcularSubtotal`. */
export interface ItemCardapioMinimo {
  id: number | string
  secao: Cardapio['secao']
  nome?: string | null
  preco?: number | null
}

/** Erros de domínio do cálculo de subtotal (união discriminada por `tipo`). */
export type ErroCalculoSubtotal =
  | { tipo: 'item_inexistente'; item: number | string }
  | { tipo: 'quantidade_invalida'; item: number | string; quantidade: number }
  | { tipo: 'pizza_sem_tamanho'; item: number | string }
  | { tipo: 'tamanho_invalido'; item: number | string; tamanho: number | string }

/** Item resolvido: preço unitário e snapshot do nome no momento do pedido. */
export interface ItemSubtotalResolvido {
  item: number | string
  tamanho: number | string | null
  quantidade: number
  nomeSnapshot: string
  precoUnitario: number
}

export type ResultadoSubtotal =
  | { ok: true; subtotal: number; itens: ItemSubtotalResolvido[] }
  | { ok: false; erros: ErroCalculoSubtotal[] }

// Mensagens pt-BR por tipo de erro (usadas pelo hook da collection e pelo
// endpoint para rejeitar a criação com mensagem clara).
export function descreverErroSubtotal(erro: ErroCalculoSubtotal): string {
  switch (erro.tipo) {
    case 'item_inexistente':
      return `Item de cardápio inexistente: ${erro.item}.`
    case 'quantidade_invalida':
      return `Quantidade inválida (${erro.quantidade}) para o item ${erro.item}: deve ser um inteiro maior ou igual a 1.`
    case 'pizza_sem_tamanho':
      return `O item ${erro.item} não tem preço próprio (pizza): informe o tamanho.`
    case 'tamanho_invalido':
      return `Tamanho inválido (${erro.tamanho}) para o item ${erro.item}: deve ser um item da seção Tamanhos com preço definido.`
  }
}

/**
 * Calcula o subtotal de um pedido a partir dos preços ATUAIS do cardápio.
 *
 * Regras (Tarefa 1 de delivery-pedidos.md):
 * - Para cada item, o documento do cardápio é resolvido por id em `cardapio`.
 * - Se `item.preco` é null (pizza), o preço vem do `tamanho` referenciado,
 *   que precisa existir, pertencer à seção 'Tamanhos' e ter preço definido.
 * - Quantidade deve ser inteiro >= 1.
 * - subtotal = Σ precoUnitario × quantidade (arredondado a 2 casas).
 *
 * Não lança exceção: devolve `{ ok: false, erros }` com TODOS os erros
 * encontrados, ou `{ ok: true, subtotal, itens }` com os snapshots
 * (nome/preço unitário) resolvidos por item.
 */
export function calcularSubtotal(
  itens: ItemPedidoEntrada[],
  cardapio: ItemCardapioMinimo[],
): ResultadoSubtotal {
  const porId = new Map(cardapio.map((doc) => [String(doc.id), doc]))
  const erros: ErroCalculoSubtotal[] = []
  const resolvidos: ItemSubtotalResolvido[] = []

  for (const entrada of itens) {
    const doc = porId.get(String(entrada.item))
    if (!doc) {
      erros.push({ tipo: 'item_inexistente', item: entrada.item })
      continue
    }

    if (!Number.isInteger(entrada.quantidade) || entrada.quantidade < 1) {
      erros.push({ tipo: 'quantidade_invalida', item: entrada.item, quantidade: entrada.quantidade })
      continue
    }

    let precoUnitario: number | null
    let tamanhoResolvido: number | string | null = null

    if (doc.preco != null) {
      // Item de preço fixo: o preço vem do próprio documento.
      precoUnitario = doc.preco
    } else {
      // Item sem preço próprio (pizza): o preço vem do tamanho referenciado.
      if (entrada.tamanho == null) {
        erros.push({ tipo: 'pizza_sem_tamanho', item: entrada.item })
        continue
      }
      const docTamanho = porId.get(String(entrada.tamanho))
      if (!docTamanho || docTamanho.secao !== 'Tamanhos' || docTamanho.preco == null) {
        erros.push({ tipo: 'tamanho_invalido', item: entrada.item, tamanho: entrada.tamanho })
        continue
      }
      precoUnitario = docTamanho.preco
      tamanhoResolvido = entrada.tamanho
    }

    resolvidos.push({
      item: entrada.item,
      tamanho: tamanhoResolvido,
      quantidade: entrada.quantidade,
      nomeSnapshot: doc.nome ?? '',
      precoUnitario,
    })
  }

  if (erros.length > 0) {
    return { ok: false, erros }
  }

  // Soma em centavos para evitar ruído de ponto flutuante, devolvendo reais.
  const subtotal =
    Math.round(resolvidos.reduce((acc, i) => acc + i.precoUnitario * i.quantidade, 0) * 100) / 100

  return { ok: true, subtotal, itens: resolvidos }
}

// ---------------------------------------------------------------------------
// Validação da submissão pública (Tarefa 4)
// ---------------------------------------------------------------------------

/** Forma do corpo JSON aceito pelo endpoint público de submissão. */
export interface PedidoInput {
  nome?: unknown
  telefone?: unknown
  itens?: unknown
  latitude?: unknown
  longitude?: unknown
  localidade?: unknown
  observacoes?: unknown
}

/**
 * Valida os campos obrigatórios do pedido (RN06, RN07): nome e telefone
 * (WhatsApp) não vazios, ao menos um item com id e quantidade inteira >= 1, e
 * latitude/longitude finitas. Retorna a lista de erros em pt-BR (vazia =
 * válido). A resolução de preços/subtotal NÃO acontece aqui — é trabalho de
 * `calcularSubtotal`, com os dados do cardápio.
 */
export function validarPedido(input: PedidoInput): string[] {
  const erros: string[] = []

  if (typeof input.nome !== 'string' || input.nome.trim() === '') {
    erros.push('Nome é obrigatório.')
  }

  if (typeof input.telefone !== 'string' || input.telefone.trim() === '') {
    erros.push('Telefone (WhatsApp) é obrigatório.')
  }

  if (!Array.isArray(input.itens) || input.itens.length === 0) {
    erros.push('O pedido precisa de ao menos um item.')
  } else {
    for (const [indice, item] of input.itens.entries()) {
      const bruto = item as Partial<ItemPedidoEntrada> | null
      if (bruto == null || typeof bruto !== 'object' || bruto.item == null) {
        erros.push(`Item ${indice + 1}: item do cardápio é obrigatório.`)
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

  if (typeof input.latitude !== 'number' || !Number.isFinite(input.latitude)) {
    erros.push('Latitude da entrega é obrigatória (número finito).')
  }

  if (typeof input.longitude !== 'number' || !Number.isFinite(input.longitude)) {
    erros.push('Longitude da entrega é obrigatória (número finito).')
  }

  return erros
}
