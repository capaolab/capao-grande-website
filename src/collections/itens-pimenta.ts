import type { PayloadRequest } from 'payload'

import { calcularSubtotalPimenta, type ItemPimentaEntrada } from '@/lib/pimenta'

// Resolução server-side dos itens de um pedido de pimenta em mel — análogo a
// itens-cardapio.ts. Busca os produtos ATIVOS referenciados e delega preço
// (unitário ou de lote) e subtotal a `calcularSubtotalPimenta`
// (lib/pimenta.ts): preços atuais do catálogo, nunca valores do cliente.

export interface ItemDocumentoPimenta {
  produto: unknown
  quantidade: unknown
  [campo: string]: unknown
}

/** Id de um relationship que pode vir populado ({ id }) ou como id. */
function idDe(valor: unknown): number | string {
  if (valor != null && typeof valor === 'object' && 'id' in valor) {
    return (valor as { id: number | string }).id
  }
  return valor as number | string
}

export async function resolverItensPimenta(
  itens: ItemDocumentoPimenta[],
  req: PayloadRequest,
): Promise<{ subtotal: number; itens: ItemDocumentoPimenta[] }> {
  const entradas: ItemPimentaEntrada[] = itens.map((item) => ({
    produto: idDe(item.produto),
    quantidade: item.quantidade as number,
  }))

  const ids = [...new Set(entradas.map((e) => e.produto).filter((id) => id != null))]

  const { docs: produtos } = await req.payload.find({
    collection: 'produtos-pimenta',
    where: { and: [{ id: { in: ids } }, { ativo: { equals: true } }] },
    limit: 0,
    depth: 0,
    req,
  })

  const resultado = calcularSubtotalPimenta(entradas, produtos)
  if (!resultado.ok) {
    throw new Error(`Pedido inválido: ${resultado.erros.join(' ')}`)
  }

  // Snapshots por item preservam o valor cobrado mesmo que o catálogo mude.
  return {
    subtotal: resultado.subtotal,
    itens: itens.map((item, indice) => ({
      ...item,
      nomeSnapshot: resultado.itens[indice].nomeSnapshot,
      precoUnitario: resultado.itens[indice].precoUnitario,
      lote: resultado.itens[indice].lote,
    })),
  }
}
