import { describe, expect, it } from 'vitest'
import fc from 'fast-check'

describe('runner de testes', () => {
  it('vitest está configurado e executa', () => {
    expect(true).toBe(true)
  })

  it('fast-check usa o padrão global de no mínimo 100 iterações', () => {
    // configureGlobal foi chamado em tests/setup.ts com numRuns: 100.
    // Um property test simples confirma que o fast-check está operacional.
    fc.assert(
      fc.property(fc.integer(), (n) => Number.isInteger(n)),
    )
    expect(fc.readConfigureGlobal().numRuns).toBe(100)
  })
})
