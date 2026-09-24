import type { PayloadHandler } from 'payload'

import { validarPedido, type ItemPedidoEntrada, type PedidoInput } from '@/lib/pedidos'

// Endpoint público de submissão de pedidos de delivery
// (docs/features/delivery-pedidos.md, Tarefa 4) — POST /api/submeter-pedido.
//
// Fluxo:
//   a) Honeypot anti-spam (P7): se o campo `website` vier preenchido (bots
//      preenchem campos invisíveis), respondemos 201 FALSO sem gravar nada.
//   b) Rate limit em memória por IP (P7): no máximo LIMITE_SUBMISSOES por
//      JANELA_RATE_LIMIT_MS; excedido → 429.
//   c) Validação server-side dos campos obrigatórios (RN06, RN07) via
//      `validarPedido` (função pura de lib/pedidos.ts).
//   d) Criação via Local API: os hooks da collection `pedidos` geram o código
//      público e recalculam o subtotal a partir dos preços atuais do cardápio
//      (NUNCA confiando no cliente); erros de domínio → 400.
//   e) Sucesso → 201 { id, codigo, subtotal } (o subtotal é só dos produtos;
//      o frete é informado depois pelo atendente via mensagem — RN08).

// Rate limit por IP (P7). Constantes no topo para ajuste operacional.
const LIMITE_SUBMISSOES = 5
const JANELA_RATE_LIMIT_MS = 10 * 60 * 1000 // 10 minutos

// Timestamps das submissões recentes por IP. Em memória: suficiente para a v1
// (instância única); zera a cada restart, o que é aceitável para mitigação.
const submissoesPorIp = new Map<string, number[]>()

function ipDoCliente(req: { headers: Headers }): string {
  // Atrás de proxy (Vercel), o IP real vem em x-forwarded-for (primeiro da
  // lista). Sem proxy, caímos num bucket compartilhado.
  const encaminhado = req.headers.get('x-forwarded-for')
  return encaminhado?.split(',')[0]?.trim() || 'desconhecido'
}

function dentroDoLimite(ip: string, agora: number): boolean {
  const recentes = (submissoesPorIp.get(ip) ?? []).filter(
    (instante) => agora - instante < JANELA_RATE_LIMIT_MS,
  )
  if (recentes.length >= LIMITE_SUBMISSOES) {
    submissoesPorIp.set(ip, recentes)
    return false
  }
  recentes.push(agora)
  submissoesPorIp.set(ip, recentes)
  return true
}

export const submeterPedido: PayloadHandler = async (req) => {
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
  if (typeof corpo.website === 'string' && corpo.website.trim() !== '') {
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
