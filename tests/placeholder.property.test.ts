import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { isAConfirmar } from '../lib/design/placeholder'

// Property 10: Placeholder para valores ausentes ou "a confirmar".
//
// `isAConfirmar` é o predicado puro que decide se um campo textual deve ser
// substituído por `Placeholder_AConfirmar` (Req 19.1, 19.2). Ele é pendente
// para null/undefined/vazio/whitespace e para a frase EXATA "a confirmar",
// comparada de forma insensível a caixa e a acentos (trim + toLowerCase +
// NFD + remoção de combinantes). Não é substring: "hoje" e outros valores
// legítimos não são pendentes.
//
// Estes testes se alinham à semântica IMPLEMENTADA/desejada (frase exata),
// então não afirmamos que substrings como "ano a confirmar" sejam pendentes.

/** Caracteres de whitespace usados nos geradores (espaço, tab, quebras). */
const WHITESPACE_CHARS = [' ', '\t', '\n', '\r', '\f', '\v']

/** Gerador de strings compostas somente por whitespace (possivelmente vazias). */
const whitespaceString = fc
  .array(fc.constantFrom(...WHITESPACE_CHARS), { minLength: 0, maxLength: 8 })
  .map((chars) => chars.join(''))

/** Variantes acentuadas por letra da frase "a confirmar". */
const ACCENT_VARIANTS: Record<string, string[]> = {
  a: ['a', 'á', 'à', 'ã', 'â', 'ä'],
  c: ['c'],
  o: ['o', 'ó', 'ò', 'õ', 'ô', 'ö'],
  n: ['n'],
  f: ['f'],
  i: ['i', 'í', 'ì', 'î', 'ï'],
  r: ['r'],
  m: ['m'],
}

/**
 * Para uma letra base, escolhe uma variante (acentuada ou não) e um caso
 * (maiúsculo/minúsculo), retornando um gerador de um único caractere.
 * Espaços internos da frase são preservados como estão.
 */
function letterArb(letter: string): fc.Arbitrary<string> {
  if (letter === ' ') return fc.constant(' ')
  const variants = ACCENT_VARIANTS[letter] ?? [letter]
  return fc
    .constantFrom(...variants)
    .chain((v) => fc.boolean().map((upper) => (upper ? v.toUpperCase() : v)))
}

/**
 * Gera uma variante de "a confirmar" com caso e acentos misturados por letra
 * e whitespace arbitrário no início e no fim. Toda variante deve normalizar
 * para a frase canônica e, portanto, ser pendente.
 */
const aConfirmarVariant = fc
  .tuple(
    whitespaceString,
    ...'a confirmar'.split('').map((l) => letterArb(l)),
    whitespaceString,
  )
  .map((parts) => parts.join(''))

/**
 * Normaliza como a implementação para poder filtrar, nos testes de "não
 * pendente", quaisquer strings que colidam com o vazio ou com a frase.
 */
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

describe('Feature: payload-cms-integration, Property 10: Placeholder para valores ausentes ou a confirmar', () => {
  // Propriedade 1: qualquer variante de "a confirmar" (caso/acento/whitespace) é pendente.
  it('trata qualquer variante de "a confirmar" (caixa/acento/espaços) como pendente', () => {
    fc.assert(
      fc.property(aConfirmarVariant, (variant) => {
        expect(isAConfirmar(variant)).toBe(true)
      }),
    )
  })

  // Propriedade 2: null e undefined são pendentes.
  it('trata null e undefined como pendentes', () => {
    fc.assert(
      fc.property(fc.constantFrom(null, undefined), (value) => {
        expect(isAConfirmar(value)).toBe(true)
      }),
    )
  })

  // Propriedade 3: strings só de whitespace são pendentes.
  it('trata strings compostas apenas por espaços em branco como pendentes', () => {
    fc.assert(
      fc.property(whitespaceString, (value) => {
        expect(isAConfirmar(value)).toBe(true)
      }),
    )
  })

  // Propriedade 4: strings arbitrárias que não sejam a frase nem vazias não são pendentes.
  it('trata strings arbitrárias (não vazias e diferentes da frase) como não pendentes', () => {
    fc.assert(
      fc.property(
        fc
          .string()
          .filter((s) => {
            const n = normalize(s)
            return n !== '' && n !== 'a confirmar'
          }),
        (value) => {
          expect(isAConfirmar(value)).toBe(false)
        },
      ),
    )
  })

  // Propriedade 5: valores não-string e não-nulos são considerados presentes (não pendentes).
  it('trata valores não-string e não-nulos como não pendentes', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.double({ noNaN: true }),
          fc.boolean(),
          fc.object(),
          fc.array(fc.anything()),
        ),
        (value) => {
          expect(isAConfirmar(value)).toBe(false)
        },
      ),
    )
  })

  // Exemplos: pendentes.
  it.each([
    ['string vazia', ''],
    ['apenas espaços', '   '],
    ['frase minúscula', 'a confirmar'],
    ['frase capitalizada', 'A Confirmar'],
  ])('exemplo pendente: %s', (_label, value) => {
    expect(isAConfirmar(value)).toBe(true)
  })

  // Exemplo: não pendente.
  it('exemplo não pendente: "hoje"', () => {
    expect(isAConfirmar('hoje')).toBe(false)
  })
})
