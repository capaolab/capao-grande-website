// Sessão do usuário no cliente (docs/features/dashboard-pedidos.md).
//
// Helpers client-side para componentes que precisam saber se há sessão ativa
// (cookie httpOnly `payload-token`) e para encerrá-la. Sem dependência de
// Payload/Next — mesma restrição de lib/permissoes.ts: precisa funcionar no
// build estático de preview (CONTENT_SOURCE=static), onde a API não existe.
// Nesse caso `buscarUsuarioAtual` devolve null (tratado como "deslogado") e
// a UI degrada graciosamente.

/** Usuário autenticado no formato devolvido por `GET /api/users/me`. */
export interface UsuarioAtual {
  id: number
  email?: string | null
  nome?: string | null
  sobrenome?: string | null
  telefone?: string | null
  role?: string | null
  /** Localização opcional do cliente (pimenta-em-mel.md, RN-P07). */
  latitude?: number | null
  longitude?: number | null
  localidade?: string | null
}

/**
 * Devolve o usuário da sessão atual ou null quando não há sessão válida,
 * quando a API responde erro ou quando ela nem existe (preview estático,
 * offline). Nunca lança — o componente decide como exibir cada caso.
 */
export async function buscarUsuarioAtual(): Promise<UsuarioAtual | null> {
  try {
    const res = await fetch('/api/users/me', { credentials: 'same-origin' })
    if (!res.ok) return null
    const dados = (await res.json()) as { user?: UsuarioAtual | null }
    return dados.user ?? null
  } catch {
    return null
  }
}

/**
 * Encerra a sessão chamando o endpoint nativo do Payload
 * (`POST /api/users/logout`), que limpa o cookie `payload-token`. Falhas de
 * rede são ignoradas: sem API não há sessão a encerrar.
 */
export async function sair(): Promise<void> {
  try {
    await fetch('/api/users/logout', {
      method: 'POST',
      credentials: 'same-origin',
    })
  } catch {
    // Sem API (preview estático) ou offline: nada a encerrar.
  }
}
