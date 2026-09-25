import type { PayloadHandler } from 'payload'

import {
  validarPedidoPimenta,
  type ItemPimentaEntrada,
  type PedidoPimentaInput,
} from '@/lib/pimenta'

import { criarRateLimit, ehHoneypot, ipDoCliente } from './protecao'

// Endpoint de submissão de pedidos de pimenta em mel
// (docs/features/pimenta-em-mel.md) — POST /api/submeter-pedido-pimenta.
// Mesmo fluxo de submeter-pedido.ts (delivery):
//   0) sessão obrigatória → 401;
//   a) honeypot → 201 falso sem gravar;
//   b) rate limit por IP → 429;
//   c) validação server-side (`validarPedidoPimenta`) → 400;
//   d) criação via Local API — os hooks de `pedidos-pimenta` geram o código,
//      resolvem preço unitário/lote pelo catálogo atual e exigem o ponto no
//      mapa na entrega; erros de domínio → 400;
//   e) 201 { id, codigo, subtotal }.

const dentroDoLimite = criarRateLimit(5)

export const submeterPedidoPimenta: PayloadHandler = async (req) => {
  if (!req.user) {
    return Response.json(
      { erros: ['Entre na sua conta para enviar o pedido.'] },
      { status: 401 },
    )
  }

  let corpo: PedidoPimentaInput & { website?: unknown }
  try {
    corpo = (await req.json!()) as PedidoPimentaInput & { website?: unknown }
  } catch {
    return Response.json({ erros: ['Corpo da requisição inválido (JSON esperado).'] }, { status: 400 })
  }

  if (ehHoneypot(corpo)) {
    return Response.json({ recebido: true }, { status: 201 })
  }

  if (!dentroDoLimite(ipDoCliente(req), Date.now())) {
    return Response.json(
      { erros: ['Muitas submissões em pouco tempo. Tente novamente em alguns minutos.'] },
      { status: 429 },
    )
  }

  const erros = validarPedidoPimenta(corpo)
  if (erros.length > 0) {
    return Response.json({ erros }, { status: 400 })
  }

  const entrega = corpo.modalidade === 'entrega'
  const texto = (valor: unknown) =>
    typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null

  try {
    const pedido = await req.payload.create({
      collection: 'pedidos-pimenta',
      data: {
        nome: (corpo.nome as string).trim(),
        telefone: (corpo.telefone as string).trim(),
        ...(texto(corpo.estabelecimento) ? { estabelecimento: texto(corpo.estabelecimento) } : {}),
        itens: (corpo.itens as ItemPimentaEntrada[]).map((item) => ({
          produto: Number(item.produto),
          quantidade: item.quantidade,
        })),
        modalidade: entrega ? 'entrega' : 'retirada',
        ...(entrega
          ? {
              latitude: corpo.latitude as number,
              longitude: corpo.longitude as number,
              ...(texto(corpo.localidade) ? { localidade: texto(corpo.localidade) } : {}),
            }
          : {}),
        ...(texto(corpo.observacoes) ? { observacoes: corpo.observacoes as string } : {}),
        status: 'pendente',
      },
      req,
    })

    return Response.json(
      { id: pedido.id, codigo: pedido.codigo, subtotal: pedido.subtotal },
      { status: 201 },
    )
  } catch (erro) {
    req.payload.logger.error(erro)
    const mensagem = erro instanceof Error ? erro.message : 'Falha ao registrar o pedido.'
    return Response.json({ erros: [mensagem] }, { status: 400 })
  }
}
