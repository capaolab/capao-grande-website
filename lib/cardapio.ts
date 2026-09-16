// Funções puras do cardápio: renderização de preço e agrupamento por seção
// (Requisitos 6 e 14). Nenhuma dependência de Payload/Next/DB para permitir
// testes de propriedade (tasks 7.6 e 7.8) com entradas sintéticas.

import type { Cardapio } from '@/src/payload-types'

/** Seções do cardápio na ordem fixa de exibição (Requisito 6.2 / 14.1). */
export type SecaoCardapio = Cardapio['secao']

/**
 * Ordem canônica das seções do cardápio. `agruparCardapio` sempre devolve as
 * seções nesta sequência, independentemente da ordem de chegada dos itens.
 */
export const ORDEM_SECOES: readonly SecaoCardapio[] = [
  'Pizzas',
  'Tamanhos',
  'Bebidas',
  'Vinhos',
] as const

/**
 * Renderiza o preço de um item do cardápio.
 *
 * É a identidade sobre a string armazenada (Requisitos 6.3, 6.4, 14.4): o texto
 * é preservado palavra por palavra, sem trim, sem reformatação numérica e sem
 * normalização de qualquer tipo. Retorna exatamente a string recebida.
 */
export function renderPreco(preco: string): string {
  return preco
}

/** Forma mínima aceita por `agruparCardapio` (compatível com `Cardapio`). */
export interface ItemAgrupavel {
  secao: SecaoCardapio
  ordem?: number | null
}

export interface SecaoAgrupada<T extends ItemAgrupavel> {
  secao: SecaoCardapio
  itens: T[]
}

/**
 * Agrupa itens do cardápio por `secao`, preservando a ordem interna por `ordem`
 * crescente (Requisitos 14.1, 14.2, 6.5).
 *
 * Comportamento e invariantes:
 * - Não filtra por `ativo`: assume que o filtro de itens ativos é feito pela
 *   camada de query (Requisito 6.6). Todo item recebido aparece exatamente uma
 *   vez no resultado.
 * - As seções são retornadas na ordem canônica `ORDEM_SECOES`
 *   (Pizzas, Tamanhos, Bebidas, Vinhos). Seções sem itens são omitidas.
 * - Dentro de cada seção, a ordenação por `ordem` é ascendente e estável:
 *   itens com o mesmo `ordem` (ou `ordem` ausente) mantêm a ordem de entrada.
 *   Itens com `ordem` ausente (null/undefined) são tratados como 0.
 */
export function agruparCardapio<T extends ItemAgrupavel>(itens: T[]): SecaoAgrupada<T>[] {
  const porSecao = new Map<SecaoCardapio, T[]>()

  for (const item of itens) {
    const grupo = porSecao.get(item.secao)
    if (grupo) {
      grupo.push(item)
    } else {
      porSecao.set(item.secao, [item])
    }
  }

  const resultado: SecaoAgrupada<T>[] = []

  for (const secao of ORDEM_SECOES) {
    const grupo = porSecao.get(secao)
    if (!grupo || grupo.length === 0) continue

    // Ordenação estável por `ordem` ascendente. `Array.prototype.sort` é
    // estável nos runtimes atuais; para empates o comparador devolve 0,
    // preservando a ordem de inserção.
    const ordenado = [...grupo].sort((a, b) => ordemDe(a) - ordemDe(b))
    resultado.push({ secao, itens: ordenado })
  }

  return resultado
}

function ordemDe(item: ItemAgrupavel): number {
  return item.ordem ?? 0
}
