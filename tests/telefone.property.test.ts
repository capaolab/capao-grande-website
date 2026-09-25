import { describe, expect, it } from 'vitest'
import fc from 'fast-check'

import { MIN_DIGITOS_TELEFONE, normalizarTelefone, telefonePlausivel } from '../lib/telefone'

// Testes de propriedade/unidade das funções puras de telefone
// (docs/features/dashboard-pedidos.md): a normalização é o vínculo entre
// `pedidos.telefone` e `users.telefone` — precisa ser determinística.

describe('normalizarTelefone', () => {
  it('remove tudo que não é dígito', () => {
    expect(normalizarTelefone('(75) 99999-0000')).toBe('75999990000')
    expect(normalizarTelefone('+55 75 9 9999-0000')).toBe('5575999990000')
    expect(normalizarTelefone('75 3234 1234')).toBe('7532341234')
  })

  it('é idempotente: normalizar duas vezes dá o mesmo resultado', () => {
    fc.assert(
      fc.property(fc.string(), (entrada) => {
        expect(normalizarTelefone(normalizarTelefone(entrada))).toBe(normalizarTelefone(entrada))
      }),
    )
  })

  it('a saída contém apenas dígitos, para qualquer entrada', () => {
    fc.assert(
      fc.property(fc.string(), (entrada) => {
        expect(normalizarTelefone(entrada)).toMatch(/^\d*$/)
      }),
    )
  })

  it('entradas diferentes com os mesmos dígitos convergem (mesmo vínculo)', () => {
    expect(normalizarTelefone('(75) 99999-0000')).toBe(normalizarTelefone('75999990000'))
  })
})

describe('telefonePlausivel', () => {
  it('aceita telefone com DDD (>= 10 dígitos)', () => {
    expect(telefonePlausivel('(75) 99999-0000')).toBe(true)
    expect(telefonePlausivel('75 3234-1234')).toBe(true)
  })

  it('rejeita telefone curto demais para ter DDD', () => {
    expect(telefonePlausivel('99999-0000')).toBe(false)
    expect(telefonePlausivel('')).toBe(false)
  })

  it('a decisão depende só da contagem de dígitos', () => {
    fc.assert(
      fc.property(fc.string(), (entrada) => {
        const digitos = entrada.replace(/\D/g, '').length
        expect(telefonePlausivel(entrada)).toBe(digitos >= MIN_DIGITOS_TELEFONE)
      }),
    )
  })
})
