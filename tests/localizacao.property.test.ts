import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  LOCALE_PADRAO,
  resolverLocalizado,
  type ValorLocalizado,
} from '../lib/localizacao'

// Property 9: Fallback de localização para pt.
//
// Metamórfico sobre `resolverLocalizado` (função pura em `lib/localizacao.ts`):
//  - valor `en` ausente/vazio com fallback habilitado ⇒ retorna o valor `pt` (Req 3.6);
//  - leitura sem locale informado ⇒ retorna o valor `pt` (Req 3.5);
//  - pt como padrão / en secundário (Req 3.1).
//
// Mínimo de 100 iterações por propriedade (padrão global em tests/setup.ts).

// --- Arbitraries -----------------------------------------------------------

/**
 * String "não-vazia" do ponto de vista da semântica: após `trim()` sobra ao
 * menos um caractere. É o que `resolverLocalizado` considera presente.
 */
const stringNaoVazia: fc.Arbitrary<string> = fc
  .string({ minLength: 1 })
  .filter((s) => s.trim() !== '')

/**
 * Valores "vazios/ausentes" que a função trata como pendentes:
 * undefined, null, '' e strings só com espaços em branco.
 */
const valorVazio: fc.Arbitrary<string | null | undefined> = fc.oneof(
  fc.constant(undefined),
  fc.constant(null),
  fc.constant(''),
  // whitespace-only (espaços, tabs, quebras de linha)
  fc
    .array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 5 })
    .map((chars) => chars.join('')),
)

// --- Testes ----------------------------------------------------------------

describe('Feature: payload-cms-integration, Property 9: Fallback de localização para pt', () => {
  it('en ausente/vazio + fallback=true ⇒ retorna o valor pt (Req 3.6)', () => {
    fc.assert(
      fc.property(stringNaoVazia, valorVazio, (pt, enVazio) => {
        const valor: ValorLocalizado = { pt, en: enVazio }
        expect(resolverLocalizado(valor, 'en', true)).toBe(pt)
      }),
    )
  })

  it('sem locale informado ⇒ retorna o valor pt (Req 3.5)', () => {
    fc.assert(
      fc.property(stringNaoVazia, fc.oneof(stringNaoVazia, valorVazio), (pt, en) => {
        const valor: ValorLocalizado = { pt, en }
        expect(resolverLocalizado(valor, undefined)).toBe(pt)
        // O padrão de locale é pt (Req 3.1): informar 'pt' explicitamente é equivalente.
        expect(resolverLocalizado(valor, LOCALE_PADRAO)).toBe(pt)
      }),
    )
  })

  it('en presente e não-vazio ⇒ retorna en (complemento/sanidade)', () => {
    fc.assert(
      fc.property(stringNaoVazia, stringNaoVazia, (pt, en) => {
        const valor: ValorLocalizado = { pt, en }
        expect(resolverLocalizado(valor, 'en')).toBe(en)
      }),
    )
  })

  it('metamórfico: leitura en com fallback cai para pt quando en vazio e iguala en quando presente', () => {
    fc.assert(
      fc.property(
        stringNaoVazia,
        fc.oneof(stringNaoVazia, valorVazio),
        (pt, en) => {
          const valor: ValorLocalizado = { pt, en }
          const resultado = resolverLocalizado(valor, 'en', true)
          const enPresente = typeof en === 'string' && en.trim() !== ''

          if (enPresente) {
            // en presente: leitura em en devolve exatamente en.
            expect(resultado).toBe(en)
          } else {
            // en ausente/vazio: fallback devolve o valor pt (Req 3.6).
            expect(resultado).toBe(pt)
          }

          // Metamorfose adicional: sem locale sempre devolve pt, independente de en.
          expect(resolverLocalizado(valor, undefined)).toBe(pt)
        },
      ),
    )
  })
})
