// lib/permissoes.ts — Papéis de usuário e regras de redirecionamento.
//
// Funções PURAS (sem dependência de Payload/Next) para serem usadas tanto em
// client components (LoginForm, AreaInternaGuard) quanto nos testes. O tipo
// `Papel` espelha as options do campo `role` de src/collections/Users.ts —
// mantido como string union local (e não importado de payload-types) para que
// este módulo funcione em qualquer contexto, inclusive no build estático de
// preview (CONTENT_SOURCE=static), que não pode puxar a cadeia do Payload.

/** Papéis de usuário do sistema (espelha `role` em src/collections/Users.ts). */
export type Papel = 'admin' | 'funcionario' | 'cliente'

/** Rotas de destino após o login, por papel. */
export const ROTA_ADMIN = '/admin'
export const ROTA_FUNCIONARIO = '/area-funcionario'
export const ROTA_CLIENTE = '/area-cliente'
export const ROTA_LOGIN = '/login'

/**
 * Rota para a qual o usuário é enviado após autenticar:
 * - admin       -> painel do Payload (`/admin`)
 * - funcionario -> área interna de gestão (`/area-funcionario`)
 * - cliente     -> área do cliente (`/area-cliente`)
 * Qualquer valor inesperado/ausente cai no fallback seguro `/login`.
 */
export function rotaPorRole(role: string | null | undefined): string {
  switch (role) {
    case 'admin':
      return ROTA_ADMIN
    case 'funcionario':
      return ROTA_FUNCIONARIO
    case 'cliente':
      return ROTA_CLIENTE
    default:
      return ROTA_LOGIN
  }
}

/** Somente admin acessa o painel do Payload. */
export function podeAcessarPainel(role: string | null | undefined): boolean {
  return role === 'admin'
}

/**
 * Acesso às áreas internas do site. Admin pode ver ambas (para suporte);
 * funcionário e cliente ficam restritos à própria área.
 */
export function podeAcessarArea(
  role: string | null | undefined,
  area: 'funcionario' | 'cliente',
): boolean {
  if (role === 'admin') return true
  return role === area
}

/** Parâmetro de query com a rota de retorno pós-login (ex.: `/login?next=/pedido`). */
export const PARAM_RETORNO = 'next'

/**
 * Valida a rota de retorno recebida por query string e a devolve apenas se
 * for um caminho INTERNO do site (começa com `/`, sem `//` nem `\` — que o
 * navegador trataria como outro host). Qualquer outra coisa ⇒ null, evitando
 * open redirect.
 */
export function rotaDeRetorno(valor: string | null | undefined): string | null {
  if (typeof valor !== 'string') return null
  if (!valor.startsWith('/') || valor.startsWith('//')) return null
  if (valor.includes('\\')) return null
  return valor
}

/** Anexa a rota de retorno (validada) a um caminho, ex.: `/login?next=%2Fpedido`. */
export function comRetorno(caminho: string, retorno: string | null | undefined): string {
  const seguro = rotaDeRetorno(retorno)
  if (!seguro) return caminho
  const separador = caminho.includes('?') ? '&' : '?'
  return `${caminho}${separador}${PARAM_RETORNO}=${encodeURIComponent(seguro)}`
}
