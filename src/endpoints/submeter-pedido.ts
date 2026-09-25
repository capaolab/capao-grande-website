import type { PayloadHandler } from 'payload'

import { validarPedido, type ItemPedidoEntrada, type PedidoInput } from '@/lib/pedidos'

import { criarRateLimit, ehHoneypot, ipDoCliente } from './protecao'

// Endpoint de submissão de pedidos de delivery
// (docs/features/delivery-pedidos.md, Tarefa 4) — POST /api/submeter-pedido.
//
// Fluxo:
//   0) Sessão obrigatória (RN12): sem usuário autenticado (cookie
//      `payload-token`) → 401. A UI (/pedido) já exige login via
//      AreaInternaGuard; aqui a regra é garantida no servidor.
//   a) Honeypot anti-spam (P7): se o campo `website` vier preenchido (bots
//      preenchem campos invisíveis), respondemos 201 FALSO sem gravar nada.
//   b) Rate limit em memória por IP (P7, src/endpoints/protecao.ts);
//      excedido → 429.
//   c) Validação server-side dos campos obrigatórios (RN06, RN07) via
//      `validarPedido` (função pura de lib/pedidos.ts).
//   d) Criação via Local API: os hooks da collection `pedidos` geram o código
//      público e recalculam o subtotal a partir dos preços atuais do cardápio
//      (NUNCA confiando no cliente); erros de domínio → 400.
//   e) Sucesso → 201 { id, codigo, subtotal } (o subtotal é só dos produtos;
//      o frete é informado depois pelo atendente via mensagem — RN08).

// Rate limit por IP (P7): no máximo 5 submissões por 10 minutos.
const dentroDoLimite = criarRateLimit(5)

export const submeterPedido: PayloadHandler = async (req) => {
  // (0) Login obrigatório para registrar pedidos (RN12).
  if (!req.user) {
    return Response.json(
      { erros: ['Entre na sua conta para enviar o pedido.'] },
      { status: 401 },
    )
  }

  let corpo: PedidoInput & { website?: unknown }
  try {
    // PayloadRequest tipa Request como Partial<>; em runtime `json` sempre
    // existe (é um Request real do Next).
    corpo = (await req.json!()) as PedidoInput & { website?: unknown }
  } catch {
    return Response.json({ erros: ['Corpo da requisição inválido (JSON esperado).'] }, { status: 400 })
  }

  // (a) Honeypot: campo invisível preenchido ⇒ bot. Resposta 201 FALSA, sem
  // gravar nada, para não sinalizar ao bot que foi detectado.
  if (ehHoneypot(corpo)) {
    return Response.json({ recebido: true }, { status: 201 })
  }

  // (b) Rate limit por IP.
  if (!dentroDoLimite(ipDoCliente(req), Date.now())) {
    return Response.json(
      { erros: ['Muitas submissões em pouco tempo. Tente novamente em alguns minutos.'] },
      { status: 429 },
    )
  }

  // (c) Validação server-side (nome, telefone, ≥1 item, lat/lng).
  const erros = validarPedido(corpo)
  if (erros.length > 0) {
    return Response.json({ erros }, { status: 400 })
  }

  // (d) Criação via Local API — os hooks da collection geram `codigo` e
  // recalculam `subtotal` a partir do cardápio atual, rejeitando itens
  // inválidos (pizza sem tamanho, item inexistente, etc.) com 400.
  try {
    const pedido = await req.payload.create({
      collection: 'pedidos',
      data: {
        nome: (corpo.nome as string).trim(),
        telefone: (corpo.telefone as string).trim(),
        itens: (corpo.itens as ItemPedidoEntrada[]).map((item) => ({
          // Ids numéricos: o adapter Postgres usa ids inteiros. Um id não
          // numérico vira NaN e é rejeitado pela validação do Payload (400).
          item: Number(item.item),
          quantidade: item.quantidade,
          ...(item.tamanho != null ? { tamanho: Number(item.tamanho) } : {}),
        })),
        latitude: corpo.latitude as number,
        longitude: corpo.longitude as number,
        ...(typeof corpo.localidade === 'string' && corpo.localidade.trim() !== ''
          ? { localidade: corpo.localidade.trim() }
          : {}),
        ...(typeof corpo.observacoes === 'string' && corpo.observacoes.trim() !== ''
          ? { observacoes: corpo.observacoes }
          : {}),
        status: 'pendente',
      },
      req,
    })

    // (e) 201 com a referência pública do pedido.
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
