// Resolvedor puro de valores localizados (Requisitos 3.5, 3.6).
//
// Espelha a semântica de localização do Payload configurada em
// `payload.config.ts` (`locales: pt/en`, `defaultLocale: 'pt'`,
// `fallback: true`). Este módulo NÃO importa Payload/Next: é uma função pura
// sobre um valor localizado, exercitável por testes de propriedade
// (design "Testing Strategy", Property 9).

/** Locales suportados pelo site (deriva de `localization.locales`). */
export type Locale = 'pt' | 'en'

/** Locale padrão do site (`localization.defaultLocale`). */
export const LOCALE_PADRAO: Locale = 'pt'

/**
 * Valor localizado como o Payload o expõe: um objeto por locale
 * (`{ pt, en }`) quando lido sem locale específico, ou uma `string` simples
 * quando lido já resolvido para um locale.
 */
export type ValorLocalizado = string | null | undefined | Partial<Record<Locale, string | null | undefined>>

/** Considera pendente uma string ausente, vazia ou só com espaços. */
function ausente(valor: string | null | undefined): boolean {
  return valor == null || valor.trim() === ''
}

/**
 * Resolve o texto de um campo localizado para exibição.
 *
 * @param valor  O valor localizado — um objeto `{ pt, en }` ou uma `string` já resolvida.
 * @param locale O locale pedido (`'pt' | 'en'`). Quando ausente/undefined, usa pt (Req 3.5).
 * @param fallback Quando `true` (padrão), cai para o `defaultLocale` (pt) se o
 *                 valor do locale pedido estiver ausente ou vazio (Req 3.6).
 *
 * Regras:
 *  - `valor` string: já está resolvido, retorna como está (ou `null` se vazio).
 *  - sem `locale`: retorna o valor de pt (Req 3.5).
 *  - locale pedido presente e não-vazio: retorna esse valor.
 *  - locale pedido ausente/vazio e `fallback` habilitado: retorna pt (Req 3.6).
 *  - locale pedido ausente/vazio e `fallback` desabilitado: retorna `null`
 *    (usado, por exemplo, para omitir a seção "em inglês" — Req 12.4).
 */
export function resolverLocalizado(
  valor: ValorLocalizado,
  locale?: Locale,
  fallback = true,
): string | null {
  if (valor == null) return null

  if (typeof valor === 'string') {
    return ausente(valor) ? null : valor
  }

  const localeAlvo: Locale = locale ?? LOCALE_PADRAO
  const valorAlvo = valor[localeAlvo]

  if (!ausente(valorAlvo)) {
    return valorAlvo as string
  }

  if (fallback && localeAlvo !== LOCALE_PADRAO) {
    const valorPadrao = valor[LOCALE_PADRAO]
    if (!ausente(valorPadrao)) {
      return valorPadrao as string
    }
  }

  return null
}
