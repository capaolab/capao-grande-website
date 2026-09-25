import type { CollectionSlug, PayloadRequest } from 'payload'

import { gerarCodigoPedido } from '@/lib/pedidos'

// Código público curto (ex.: "A3F7") único dentro de uma collection —
// compartilhado por `pedidos` (delivery) e `caixa` (conta de mesa).
//
// Tentativas antes de desistir por colisão. Com 4 caracteres sobre um
// alfabeto de 32 símbolos há ~1M de códigos, então uma colisão é rara — mas
// o retry garante unicidade mesmo assim (verificação real via payload.find,
// não só o índice unique do banco).
const TENTATIVAS_CODIGO = 10

export async function gerarCodigoUnico(
  req: PayloadRequest,
  collection: CollectionSlug,
): Promise<string> {
  for (let tentativa = 0; tentativa < TENTATIVAS_CODIGO; tentativa++) {
    const candidato = gerarCodigoPedido()
    const { totalDocs } = await req.payload.find({
      collection,
      where: { codigo: { equals: candidato } },
      limit: 1,
      depth: 0,
      req,
    })
    if (totalDocs === 0) return candidato
  }
  throw new Error(
    `Não foi possível gerar um código único após ${TENTATIVAS_CODIGO} tentativas.`,
  )
}
