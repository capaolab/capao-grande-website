import type { PayloadRequest } from 'payload'

import {
  calcularSubtotal,
  descreverErroSubtotal,
  type ItemPedidoEntrada,
} from '@/lib/pedidos'

// Resolução server-side dos itens de cardápio de um documento — compartilhada
// pelos hooks de `pedidos` (delivery) e `caixa` (conta de mesa). Busca os
// documentos do cardápio referenciados (itens + tamanhos) e delega a decisão
// de domínio a `calcularSubtotal` (lib/pedidos.ts): preços ATUAIS do
// cardápio, nunca valores vindos do cliente.

/** Item como chega no `data` do hook (relationships podem vir como id). */
export interface ItemDocumentoCardapio {
  item: unknown
  quantidade: unknown
  tamanho?: unknown
  [campo: string]: unknown
}

/**
 * Recalcula subtotal e snapshots (nome/preço unitário) dos itens. Erros de
 * domínio (item inexistente, pizza sem tamanho, quantidade inválida) lançam
 * Error com mensagem pt-BR — rejeitando a gravação.
 */
export async function resolverItensCardapio(
  itens: ItemDocumentoCardapio[],
  req: PayloadRequest,
  rotulo: string,
): Promise<{ subtotal: number; itens: ItemDocumentoCardapio[] }> {
  const entradas: ItemPedidoEntrada[] = itens.map((item) => ({
    item: item.item as number | string,
    quantidade: item.quantidade as number,
    tamanho: (item.tamanho ?? null) as number | string | null,
  }))

  const ids = [
    ...new Set(entradas.flatMap((e) => [e.item, e.tamanho]).filter((id) => id != null)),
  ] as (number | string)[]

  const { docs: cardapio } = await req.payload.find({
    collection: 'cardapio',
    where: { id: { in: ids } },
    limit: 0,
    depth: 0,
    req,
  })

  const resultado = calcularSubtotal(entradas, cardapio)

  if (!resultado.ok) {
    throw new Error(`${rotulo} inválido: ${resultado.erros.map(descreverErroSubtotal).join(' ')}`)
  }

  // Snapshots gravados por item: preservam o valor cobrado mesmo que o
  // cardápio mude depois.
  return {
    subtotal: resultado.subtotal,
    itens: itens.map((item, indice) => ({
      ...item,
      tamanho: resultado.itens[indice].tamanho,
      nomeSnapshot: resultado.itens[indice].nomeSnapshot,
      precoUnitario: resultado.itens[indice].precoUnitario,
    })),
  }
}
