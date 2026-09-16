import { describe, expect, it } from 'vitest'
import fc from 'fast-check'

import { renderPreco } from '../lib/cardapio'

// Property 4: o preço é exibido palavra por palavra, sem trim, sem reformatação
// numérica e sem qualquer normalização. `renderPreco` é a identidade sobre a
// string armazenada (Requisitos 6.3, 6.4, 14.4, 9.3).
describe('Feature: payload-cms-integration, Property 4: Preço é preservado palavra por palavra', () => {
  it('renderPreco é identidade sobre qualquer string (byte a byte)', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(renderPreco(s)).toBe(s)
      }),
    )
  })

  it('renderPreco preserva unicode completo sem normalizar', () => {
    // unit: 'binary' cobre qualquer code point da faixa Unicode (0000-10FFFF),
    // incluindo planos astrais — equivalente ao antigo fullUnicodeString.
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (s) => {
        expect(renderPreco(s)).toBe(s)
      }),
    )
  })

  it('preserva os textos verbatim conhecidos do cardápio impresso', () => {
    const conhecidos = [
      'ver tamanhos',
      'R$ 30,00',
      'jarra 1,5 l',
      'dose',
      '',
      '  ',
      'R$ 12,50 / R$ 18,00',
      'Saboreiem com prazer!',
      '½ a ½',
      'a confirmar',
    ]

    for (const preco of conhecidos) {
      expect(renderPreco(preco)).toBe(preco)
    }
  })
})
