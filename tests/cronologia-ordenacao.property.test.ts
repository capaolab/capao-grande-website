import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { ordenarCronologia, type MarcoOrdenavel } from '../lib/cronologia'

// Property 5: Ordenação da cronologia por `ordem` crescente.
// `ordenarCronologia` produz uma lista não decrescente por `ordem`, é uma
// permutação estável da entrada e não muta a lista de origem.
// Validates: Requirements 7.4, 17.2

/** Marco de teste com uma etiqueta única (id) para checar permutação/estabilidade. */
interface MarcoTeste extends MarcoOrdenavel {
  id: number
  ordem?: number | null
}

/** `ordem` arbitrária: número finito, null ou undefined (todos tratados). */
const arbOrdem: fc.Arbitrary<number | null | undefined> = fc.oneof(
  fc.integer({ min: -1000, max: 1000 }),
  fc.constant(null),
  fc.constant(undefined),
)

/**
 * Array arbitrário de marcos. Cada marco recebe um `id` único (índice de
 * criação) para permitir comparar multiconjuntos e a ordem relativa de entrada.
 */
const arbMarcos: fc.Arbitrary<MarcoTeste[]> = fc
  .array(arbOrdem, { maxLength: 50 })
  .map((ordens) => ordens.map((ordem, id) => ({ id, ordem })))

/** Valor efetivo de ordenação: `ordem` ausente conta como 0. */
const ordemEfetiva = (m: MarcoTeste): number => m.ordem ?? 0

describe('Feature: payload-cms-integration, Property 5: Ordenação da cronologia por ordem crescente', () => {
  it('produz lista não decrescente por (ordem ?? 0)', () => {
    fc.assert(
      fc.property(arbMarcos, (marcos) => {
        const resultado = ordenarCronologia(marcos)
        for (let i = 1; i < resultado.length; i++) {
          expect(ordemEfetiva(resultado[i - 1])).toBeLessThanOrEqual(
            ordemEfetiva(resultado[i]),
          )
        }
      }),
    )
  })

  it('é uma permutação da entrada (mesmo multiconjunto de elementos)', () => {
    fc.assert(
      fc.property(arbMarcos, (marcos) => {
        const resultado = ordenarCronologia(marcos)
        // Mesmo tamanho: nada adicionado nem removido.
        expect(resultado).toHaveLength(marcos.length)
        // Mesmo multiconjunto de ids (cada id aparece o mesmo número de vezes).
        const idsEntrada = [...marcos].map((m) => m.id).sort((a, b) => a - b)
        const idsSaida = resultado.map((m) => m.id).sort((a, b) => a - b)
        expect(idsSaida).toEqual(idsEntrada)
        // Os elementos são preservados por referência (nada é fabricado).
        for (const m of resultado) {
          expect(marcos).toContain(m)
        }
      }),
    )
  })

  it('não muta a lista de entrada (retorna um novo array)', () => {
    fc.assert(
      fc.property(arbMarcos, (marcos) => {
        const copiaAntes = marcos.map((m) => ({ ...m }))
        const resultado = ordenarCronologia(marcos)
        // A referência do array de entrada não é reutilizada.
        expect(resultado).not.toBe(marcos)
        // O conteúdo e a ordem da entrada permanecem intactos.
        expect(marcos).toHaveLength(copiaAntes.length)
        marcos.forEach((m, i) => {
          expect(m.id).toBe(copiaAntes[i].id)
          expect(m.ordem).toBe(copiaAntes[i].ordem)
        })
      }),
    )
  })

  it('é estável: elementos com (ordem ?? 0) igual preservam a ordem de entrada', () => {
    fc.assert(
      fc.property(arbMarcos, (marcos) => {
        const resultado = ordenarCronologia(marcos)
        // Índice de cada id na entrada, para comparar ordem relativa.
        const indiceEntrada = new Map<number, number>()
        marcos.forEach((m, i) => indiceEntrada.set(m.id, i))
        for (let i = 1; i < resultado.length; i++) {
          const anterior = resultado[i - 1]
          const atual = resultado[i]
          if (ordemEfetiva(anterior) === ordemEfetiva(atual)) {
            // Empate na ordem => a ordem de entrada deve ser preservada.
            expect(indiceEntrada.get(anterior.id)!).toBeLessThan(
              indiceEntrada.get(atual.id)!,
            )
          }
        }
      }),
    )
  })
})
