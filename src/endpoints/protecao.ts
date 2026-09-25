// Proteções anti-spam compartilhadas pelos endpoints públicos
// (submeter-pedido, submeter-pedido-pimenta, cadastro-cliente) — P7 de
// docs/features/delivery-pedidos.md:
// - honeypot: campo invisível `website` preenchido ⇒ bot;
// - rate limit em memória por IP (instância única na v1; zera a cada
//   restart, aceitável para mitigação). Cada endpoint cria o PRÓPRIO
//   limitador, para que as cotas não se somem.

/** Janela padrão do rate limit. */
export const JANELA_RATE_LIMIT_MS = 10 * 60 * 1000 // 10 minutos

/** Campo honeypot preenchido (bots preenchem campos invisíveis). */
export function ehHoneypot(corpo: { website?: unknown }): boolean {
  return typeof corpo.website === 'string' && corpo.website.trim() !== ''
}

/** IP do cliente: atrás de proxy (Vercel) vem em x-forwarded-for (primeiro
    da lista); sem proxy, caímos num bucket compartilhado. */
export function ipDoCliente(req: { headers: Headers }): string {
  const encaminhado = req.headers.get('x-forwarded-for')
  return encaminhado?.split(',')[0]?.trim() || 'desconhecido'
}

/**
 * Cria um limitador: devolve `dentroDoLimite(ip, agora)`, que registra a
 * tentativa e responde false quando o IP já fez `limite` tentativas na janela.
 */
export function criarRateLimit(limite: number, janelaMs = JANELA_RATE_LIMIT_MS) {
  const tentativasPorIp = new Map<string, number[]>()

  return function dentroDoLimite(ip: string, agora: number): boolean {
    const recentes = (tentativasPorIp.get(ip) ?? []).filter(
      (instante) => agora - instante < janelaMs,
    )
    if (recentes.length >= limite) {
      tentativasPorIp.set(ip, recentes)
      return false
    }
    recentes.push(agora)
    tentativasPorIp.set(ip, recentes)
    return true
  }
}
